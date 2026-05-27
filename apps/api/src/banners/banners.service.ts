import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Banner, Prisma } from '@prisma/client';
import {
  BannerMediaType,
  MediaAssetKind,
  MediaAssetSource,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { ERROR_CODES } from '../common/constants/error-codes';
import { AppException } from '../common/exceptions/app.exception';
import { parseMinioPublicObjectUrl } from '../common/utils/parse-minio-public-object-url.util';
import type { AuthUser } from '../common/types/auth-user.type';
import { PrismaService } from '../database/prisma.service';
import { MediaService } from '../media/media.service';
import type { CreateBannerDto } from './dto/create-banner.dto';
import type { UpdateBannerDto } from './dto/update-banner.dto';

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
export class BannersService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(MediaService) private readonly media: MediaService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  async listHome(): Promise<PublicBannerDto[]> {
    const now = new Date();
    const rows = await this.prisma.banner.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        desktopMediaUrl: { not: null },
        mobileMediaUrl: { not: null },
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
    return rows
      .filter((row) => row.desktopMediaUrl && row.mobileMediaUrl)
      .map((row) =>
        this.mapHomeRow({
          ...row,
          desktopMediaUrl: row.desktopMediaUrl!,
          mobileMediaUrl: row.mobileMediaUrl!,
        }),
      );
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
    const [desktopAsset, mobileAsset] = await Promise.all([
      this.resolveBannerMediaAsset(dto.mediaType, dto.desktopMediaBucket, dto.desktopMediaObjectKey, dto.desktopMediaUrl),
      this.resolveBannerMediaAsset(dto.mediaType, dto.mobileMediaBucket, dto.mobileMediaObjectKey, dto.mobileMediaUrl),
    ]);
    const item = await this.prisma.banner.create({
      data: {
        title: dto.title,
        subtitle: dto.subtitle,
        description: dto.description,
        mediaType: dto.mediaType,
        desktopMediaUrl: dto.desktopMediaUrl,
        desktopMediaBucket: dto.desktopMediaBucket ?? null,
        desktopMediaObjectKey: dto.desktopMediaObjectKey ?? null,
        desktopMediaAssetId: desktopAsset?.id ?? null,
        mobileMediaUrl: dto.mobileMediaUrl,
        mobileMediaBucket: dto.mobileMediaBucket ?? null,
        mobileMediaObjectKey: dto.mobileMediaObjectKey ?? null,
        mobileMediaAssetId: mobileAsset?.id ?? null,
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
    const [desktopMediaAssetId, mobileMediaAssetId] = await Promise.all([
      this.shouldResolveMediaAsset(
        dto.desktopMediaUrl,
        dto.desktopMediaBucket,
        dto.desktopMediaObjectKey,
      )
        ? this.resolveBannerMediaAsset(
            dto.mediaType ?? old.mediaType,
            dto.desktopMediaBucket,
            dto.desktopMediaObjectKey,
            dto.desktopMediaUrl,
          ).then((asset) => asset?.id ?? null)
        : Promise.resolve(undefined),
      this.shouldResolveMediaAsset(
        dto.mobileMediaUrl,
        dto.mobileMediaBucket,
        dto.mobileMediaObjectKey,
      )
        ? this.resolveBannerMediaAsset(
            dto.mediaType ?? old.mediaType,
            dto.mobileMediaBucket,
            dto.mobileMediaObjectKey,
            dto.mobileMediaUrl,
          ).then((asset) => asset?.id ?? null)
        : Promise.resolve(undefined),
    ]);

    const item = await this.prisma.banner.update({
      where: { id },
      data: this.buildUpdateData(dto, {
        desktopMediaAssetId,
        mobileMediaAssetId,
      }),
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
    const expectedKind = expectKind
      ? expectKind === BannerMediaType.VIDEO
        ? MediaAssetKind.VIDEO
        : MediaAssetKind.IMAGE
      : undefined;
    const asset = await this.media.createAssetFromUpload(file, {
      source: MediaAssetSource.BANNER_UPLOAD,
      bucketConfigKey: 'MINIO_BUCKET_BANNERS',
      defaultBucket: 'banners',
      folder: `home/${variant}`,
      expectedKind,
      title: file?.originalname,
      mismatchErrorCode: ERROR_CODES.BANNER_MEDIA_MISMATCH,
      mismatchMessage: 'File does not match selected media type',
    });
    return {
      variant,
      assetId: asset.id,
      url: this.proxiedMediaUrl(asset.bucket, asset.objectKey, asset.url) ?? asset.url,
      bucket: asset.bucket,
      objectKey: asset.objectKey,
      detectedMediaType:
        asset.kind === MediaAssetKind.VIDEO ? BannerMediaType.VIDEO : BannerMediaType.IMAGE,
      mime: asset.mimeType,
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
      desktopMediaUrl:
        this.proxiedMediaUrl(row.desktopMediaBucket, row.desktopMediaObjectKey, row.desktopMediaUrl) ??
        row.desktopMediaUrl,
      mobileMediaUrl:
        this.proxiedMediaUrl(row.mobileMediaBucket, row.mobileMediaObjectKey, row.mobileMediaUrl) ??
        row.mobileMediaUrl,
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

  private proxiedMediaUrl(bucket: string | null, objectKey: string | null, storedUrl: string | null): string | null {
    if (!storedUrl) return null;
    const base = (this.config.get<string>('PUBLIC_API_URL') ?? this.config.get<string>('API_URL') ?? '').trim();
    if (!base) return storedUrl;
    const banners = this.config.get('MINIO_BUCKET_BANNERS', 'banners');
    const products = this.config.get('MINIO_BUCKET_PRODUCTS', 'product-images');
    const media = this.config.get('MINIO_BUCKET_MEDIA', 'media-assets');
    const allowed = new Set([banners, products, media]);
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

  private buildUpdateData(
    dto: UpdateBannerDto,
    assetIds?: {
      desktopMediaAssetId?: string | null;
      mobileMediaAssetId?: string | null;
    },
  ): Prisma.BannerUncheckedUpdateInput {
    const data: Prisma.BannerUncheckedUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.subtitle !== undefined) data.subtitle = dto.subtitle;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.mediaType !== undefined) data.mediaType = dto.mediaType;
    if (dto.desktopMediaUrl !== undefined) data.desktopMediaUrl = dto.desktopMediaUrl;
    if (dto.desktopMediaBucket !== undefined) data.desktopMediaBucket = dto.desktopMediaBucket;
    if (dto.desktopMediaObjectKey !== undefined) data.desktopMediaObjectKey = dto.desktopMediaObjectKey;
    if (assetIds?.desktopMediaAssetId !== undefined) data.desktopMediaAssetId = assetIds.desktopMediaAssetId;
    if (dto.mobileMediaUrl !== undefined) data.mobileMediaUrl = dto.mobileMediaUrl;
    if (dto.mobileMediaBucket !== undefined) data.mobileMediaBucket = dto.mobileMediaBucket;
    if (dto.mobileMediaObjectKey !== undefined) data.mobileMediaObjectKey = dto.mobileMediaObjectKey;
    if (assetIds?.mobileMediaAssetId !== undefined) data.mobileMediaAssetId = assetIds.mobileMediaAssetId;
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

  private shouldResolveMediaAsset(
    url: string | undefined,
    bucket: string | null | undefined,
    objectKey: string | null | undefined,
  ): boolean {
    return url !== undefined || bucket !== undefined || objectKey !== undefined;
  }

  private resolveBannerMediaAsset(
    mediaType: BannerMediaType,
    bucket?: string | null,
    objectKey?: string | null,
    url?: string | null,
  ) {
    return this.media.resolveAssetReference({
      bucket,
      objectKey,
      url,
      source: MediaAssetSource.BANNER_UPLOAD,
      kind: mediaType === BannerMediaType.VIDEO ? MediaAssetKind.VIDEO : MediaAssetKind.IMAGE,
    });
  }
}
