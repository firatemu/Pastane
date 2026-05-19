import { HttpStatus, Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Client } from 'minio';
import type { Banner, Prisma } from '@prisma/client';
import { BannerMediaType } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import { ERROR_CODES } from '../common/constants/error-codes';
import { AppException } from '../common/exceptions/app.exception';
import { parseMinioPublicObjectUrl } from '../common/utils/parse-minio-public-object-url.util';
import { detectBannerMedia } from '../common/utils/mime.util';
import { ensureBucketWithPublicRead } from '../common/utils/minio-public-bucket.util';
import type { AuthUser } from '../common/types/auth-user.type';
import { PrismaService } from '../database/prisma.service';
import { MINIO_CLIENT } from '../media/providers/minio.provider';
import type { CreateBannerDto } from './dto/create-banner.dto';
import type { UpdateBannerDto } from './dto/update-banner.dto';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 20 * 1024 * 1024;

export type PublicBannerDto = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  mediaType: BannerMediaType;
  desktopMediaUrl: string;
  mobileMediaUrl: string;
  buttonText: string | null;
  buttonUrl: string | null;
  sortOrder: number;
};

@Injectable()
export class BannersService implements OnModuleInit {
  private readonly logger = new Logger(BannersService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(ConfigService) private readonly config: ConfigService,
    @Inject(MINIO_CLIENT) private readonly minio: Client,
  ) {}

  async onModuleInit(): Promise<void> {
    const bucket = this.config.get('MINIO_BUCKET_BANNERS', 'banners');
    try {
      await ensureBucketWithPublicRead(this.minio, bucket);
    } catch (err) {
      this.logger.warn(
        `Banner bucket public read policy could not be applied (${bucket}): ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  async listHome(): Promise<PublicBannerDto[]> {
    const now = new Date();
    const rows = await this.prisma.banner.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        title: true,
        subtitle: true,
        description: true,
        mediaType: true,
        desktopMediaUrl: true,
        desktopMediaBucket: true,
        desktopMediaObjectKey: true,
        mobileMediaUrl: true,
        mobileMediaBucket: true,
        mobileMediaObjectKey: true,
        buttonText: true,
        buttonUrl: true,
        sortOrder: true,
      },
    });
    return rows.map((r) => this.mapHomeRow(r));
  }

  async listAdmin(): Promise<Banner[]> {
    const rows = await this.prisma.banner.findMany({ where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } });
    return rows.map((r) => this.mapAdminBannerRow(r));
  }

  async get(id: string): Promise<Banner> {
    const row = await this.getNonDeleted(id);
    return this.mapAdminBannerRow(row);
  }

  async create(dto: CreateBannerDto, actor?: AuthUser) {
    const sortOrder = dto.sortOrder ?? (await this.nextSortOrder());
    const item = await this.prisma.banner.create({
      data: {
        title: dto.title,
        subtitle: dto.subtitle,
        description: dto.description,
        mediaType: dto.mediaType,
        desktopMediaUrl: dto.desktopMediaUrl,
        desktopMediaBucket: dto.desktopMediaBucket ?? null,
        desktopMediaObjectKey: dto.desktopMediaObjectKey ?? null,
        mobileMediaUrl: dto.mobileMediaUrl,
        mobileMediaBucket: dto.mobileMediaBucket ?? null,
        mobileMediaObjectKey: dto.mobileMediaObjectKey ?? null,
        buttonText: dto.buttonText,
        buttonUrl: dto.buttonUrl,
        sortOrder,
        isActive: dto.isActive ?? true,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      },
    });
    await this.audit.log({
      actorId: actor?.sub,
      action: 'banners.create',
      entityType: 'Banner',
      entityId: item.id,
      newValues: item as unknown as Prisma.InputJsonValue,
    });
    return this.mapAdminBannerRow(item);
  }

  async update(id: string, dto: UpdateBannerDto, actor?: AuthUser) {
    const old = await this.getNonDeleted(id);

    if (dto.desktopMediaUrl !== undefined && dto.desktopMediaUrl !== old.desktopMediaUrl) {
      await this.removeStoredObject(old.desktopMediaBucket, old.desktopMediaObjectKey);
    }
    if (dto.mobileMediaUrl !== undefined && dto.mobileMediaUrl !== old.mobileMediaUrl) {
      await this.removeStoredObject(old.mobileMediaBucket, old.mobileMediaObjectKey);
    }

    const item = await this.prisma.banner.update({
      where: { id },
      data: this.buildUpdateData(dto),
    });
    await this.audit.log({
      actorId: actor?.sub,
      action: 'banners.update',
      entityType: 'Banner',
      entityId: id,
      oldValues: old as unknown as Prisma.InputJsonValue,
      newValues: item as unknown as Prisma.InputJsonValue,
    });
    return this.mapAdminBannerRow(item);
  }

  async remove(id: string, actor?: AuthUser) {
    const old = await this.getNonDeleted(id);
    await this.deleteBannerStoredFiles(old);
    const item = await this.prisma.banner.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
    await this.audit.log({
      actorId: actor?.sub,
      action: 'banners.delete',
      entityType: 'Banner',
      entityId: id,
      oldValues: old as unknown as Prisma.InputJsonValue,
    });
    return this.mapAdminBannerRow(item);
  }

  async setStatus(id: string, isActive: boolean, actor?: AuthUser) {
    const old = await this.getNonDeleted(id);
    const item = await this.prisma.banner.update({ where: { id }, data: { isActive } });
    await this.audit.log({
      actorId: actor?.sub,
      action: 'banners.status',
      entityType: 'Banner',
      entityId: id,
      oldValues: old as unknown as Prisma.InputJsonValue,
      newValues: item as unknown as Prisma.InputJsonValue,
    });
    return this.mapAdminBannerRow(item);
  }

  async reorder(ids: string[], actor?: AuthUser) {
    const existing = await this.prisma.banner.findMany({ where: { deletedAt: null }, select: { id: true } });
    if (existing.length !== ids.length) {
      throw new AppException(ERROR_CODES.BANNER_REORDER_INVALID, 'Reorder must include every banner id', HttpStatus.BAD_REQUEST);
    }
    const set = new Set(existing.map((row) => row.id));
    for (const id of ids) {
      if (!set.has(id)) {
        throw new AppException(ERROR_CODES.BANNER_REORDER_INVALID, 'Invalid banner id in reorder list', HttpStatus.BAD_REQUEST);
      }
    }
    await this.prisma.$transaction(ids.map((bannerId, index) => this.prisma.banner.update({ where: { id: bannerId }, data: { sortOrder: index } })));
    await this.audit.log({
      actorId: actor?.sub,
      action: 'banners.reorder',
      entityType: 'Banner',
      entityId: null,
      newValues: { ids } as unknown as Prisma.InputJsonValue,
    });
    return this.listAdmin();
  }

  async uploadMedia(
    file: Express.Multer.File | undefined,
    variant: 'desktop' | 'mobile',
    expectKind?: BannerMediaType,
  ) {
    if (!file?.buffer) {
      throw new AppException(ERROR_CODES.VALIDATION_FAILED, 'File is required', HttpStatus.BAD_REQUEST);
    }
    const detected = detectBannerMedia(file.buffer);
    if (!detected) {
      throw new AppException(
        ERROR_CODES.MEDIA_INVALID_TYPE,
        'Desteklenmeyen dosya türü. Görseller: JPEG, PNG, WebP veya GIF; video: MP4 veya WebM kullanın.',
        HttpStatus.BAD_REQUEST,
      );
    }
    const max = detected.kind === 'IMAGE' ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
    if (file.size > max) {
      throw new AppException(ERROR_CODES.MEDIA_FILE_TOO_LARGE, 'File is too large', HttpStatus.BAD_REQUEST);
    }
    if (expectKind !== undefined) {
      const want: 'IMAGE' | 'VIDEO' = expectKind === BannerMediaType.IMAGE ? 'IMAGE' : 'VIDEO';
      if (detected.kind !== want) {
        throw new AppException(ERROR_CODES.BANNER_MEDIA_MISMATCH, 'File does not match selected media type', HttpStatus.BAD_REQUEST);
      }
    }

    const bucket = this.config.get('MINIO_BUCKET_BANNERS', 'banners');
    await ensureBucketWithPublicRead(this.minio, bucket);
    const ext = extensionForMime(detected.mime);
    const key = `home/${variant}/${randomUUID()}${ext}`;
    try {
      await this.minio.putObject(bucket, key, file.buffer, file.size, { 'Content-Type': detected.mime });
    } catch {
      throw new AppException(ERROR_CODES.MEDIA_UPLOAD_FAILED, 'Media upload failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    const minioUrl = `${this.config.get('MINIO_PUBLIC_URL', 'http://localhost:9000')}/${bucket}/${key}`;
    const url = this.proxiedMediaUrl(bucket, key, minioUrl);
    return {
      variant,
      url,
      bucket,
      objectKey: key,
      detectedMediaType: detected.kind === 'IMAGE' ? BannerMediaType.IMAGE : BannerMediaType.VIDEO,
      mime: detected.mime,
    };
  }

  private mapHomeRow(row: {
    id: string;
    title: string;
    subtitle: string | null;
    description: string | null;
    mediaType: BannerMediaType;
    desktopMediaUrl: string;
    desktopMediaBucket: string | null;
    desktopMediaObjectKey: string | null;
    mobileMediaUrl: string;
    mobileMediaBucket: string | null;
    mobileMediaObjectKey: string | null;
    buttonText: string | null;
    buttonUrl: string | null;
    sortOrder: number;
  }): PublicBannerDto {
    return {
      id: row.id,
      title: row.title,
      subtitle: row.subtitle,
      description: row.description,
      mediaType: row.mediaType,
      desktopMediaUrl: this.proxiedMediaUrl(row.desktopMediaBucket, row.desktopMediaObjectKey, row.desktopMediaUrl),
      mobileMediaUrl: this.proxiedMediaUrl(row.mobileMediaBucket, row.mobileMediaObjectKey, row.mobileMediaUrl),
      buttonText: row.buttonText,
      buttonUrl: row.buttonUrl,
      sortOrder: row.sortOrder,
    };
  }

  private mapAdminBannerRow(row: Banner): Banner {
    return {
      ...row,
      desktopMediaUrl: this.proxiedMediaUrl(row.desktopMediaBucket, row.desktopMediaObjectKey, row.desktopMediaUrl),
      mobileMediaUrl: this.proxiedMediaUrl(row.mobileMediaBucket, row.mobileMediaObjectKey, row.mobileMediaUrl),
    };
  }

  private proxiedMediaUrl(bucket: string | null, objectKey: string | null, storedUrl: string): string {
    const base = (this.config.get<string>('PUBLIC_API_URL') ?? this.config.get<string>('API_URL') ?? '').trim();
    if (!base) return storedUrl;
    const banners = this.config.get('MINIO_BUCKET_BANNERS', 'banners');
    const products = this.config.get('MINIO_BUCKET_PRODUCTS', 'product-images');
    const allowed = new Set([banners, products]);
    let b = bucket ?? null;
    let k = objectKey ?? null;
    if (!b || !k) {
      const parsed = parseMinioPublicObjectUrl(storedUrl, allowed);
      if (parsed) {
        b = b ?? parsed.bucket;
        k = k ?? parsed.objectKey;
      }
    }
    if (!b || !k) return storedUrl;
    return `${base.replace(/\/$/, '')}/api/v1/files/${b}/${encodeURIComponent(k)}`;
  }

  private buildUpdateData(dto: UpdateBannerDto): Prisma.BannerUpdateInput {
    const data: Prisma.BannerUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.subtitle !== undefined) data.subtitle = dto.subtitle;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.mediaType !== undefined) data.mediaType = dto.mediaType;
    if (dto.desktopMediaUrl !== undefined) data.desktopMediaUrl = dto.desktopMediaUrl;
    if (dto.desktopMediaBucket !== undefined) data.desktopMediaBucket = dto.desktopMediaBucket;
    if (dto.desktopMediaObjectKey !== undefined) data.desktopMediaObjectKey = dto.desktopMediaObjectKey;
    if (dto.mobileMediaUrl !== undefined) data.mobileMediaUrl = dto.mobileMediaUrl;
    if (dto.mobileMediaBucket !== undefined) data.mobileMediaBucket = dto.mobileMediaBucket;
    if (dto.mobileMediaObjectKey !== undefined) data.mobileMediaObjectKey = dto.mobileMediaObjectKey;
    if (dto.buttonText !== undefined) data.buttonText = dto.buttonText;
    if (dto.buttonUrl !== undefined) data.buttonUrl = dto.buttonUrl;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.startsAt !== undefined) data.startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    if (dto.endsAt !== undefined) data.endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    return data;
  }

  private async nextSortOrder(): Promise<number> {
    const agg = await this.prisma.banner.aggregate({ where: { deletedAt: null }, _max: { sortOrder: true } });
    return (agg._max.sortOrder ?? -1) + 1;
  }

  private async getNonDeleted(id: string) {
    const item = await this.prisma.banner.findFirst({ where: { id, deletedAt: null } });
    if (!item) throw new AppException(ERROR_CODES.BANNER_NOT_FOUND, 'Banner not found', HttpStatus.NOT_FOUND);
    return item;
  }

  private async deleteBannerStoredFiles(row: {
    desktopMediaBucket: string | null;
    desktopMediaObjectKey: string | null;
    mobileMediaBucket: string | null;
    mobileMediaObjectKey: string | null;
  }): Promise<void> {
    await Promise.all([
      this.removeStoredObjectBestEffort(row.desktopMediaBucket, row.desktopMediaObjectKey),
      this.removeStoredObjectBestEffort(row.mobileMediaBucket, row.mobileMediaObjectKey),
    ]);
  }

  private async removeStoredObjectBestEffort(bucket: string | null, objectKey: string | null): Promise<void> {
    if (!bucket || !objectKey) return;
    try {
      await this.minio.removeObject(bucket, objectKey);
    } catch (err) {
      this.logger.warn(`MinIO removeObject failed (${bucket}/${objectKey}): ${err instanceof Error ? err.message : err}`);
    }
  }

  private async removeStoredObject(bucket: string | null, objectKey: string | null) {
    if (!bucket || !objectKey) return;
    try {
      await this.minio.removeObject(bucket, objectKey);
    } catch {
      throw new AppException(ERROR_CODES.MEDIA_DELETE_FAILED, 'Media delete failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}

function extensionForMime(mime: string): string {
  switch (mime) {
    case 'image/jpeg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    case 'image/gif':
      return '.gif';
    case 'video/mp4':
      return '.mp4';
    case 'video/webm':
      return '.webm';
    default:
      return '.bin';
  }
}
