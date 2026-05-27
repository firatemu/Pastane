import { HttpStatus, Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MediaAssetKind, MediaAssetSource } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import type { Client } from 'minio';
import { AuditService } from '../audit/audit.service';
import { ERROR_CODES } from '../common/constants/error-codes';
import { AppException } from '../common/exceptions/app.exception';
import type { AuthUser } from '../common/types/auth-user.type';
import { detectBannerMedia } from '../common/utils/mime.util';
import { ensureBucketWithPublicRead } from '../common/utils/minio-public-bucket.util';
import { parseMinioPublicObjectUrl } from '../common/utils/parse-minio-public-object-url.util';
import { normalizePagination } from '../common/utils/pagination.util';
import { PrismaService } from '../database/prisma.service';
import type { AttachMediaAssetProductImageDto } from './dto/attach-media-asset-product-image.dto';
import { MediaUsageStatus } from './dto/query-media-assets.dto';
import type { QueryMediaAssetsDto } from './dto/query-media-assets.dto';
import type { UploadMediaAssetDto } from './dto/upload-media-asset.dto';
import type { UploadMediaDto } from './dto/upload-media.dto';
import { MINIO_CLIENT } from './providers/minio.provider';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 20 * 1024 * 1024;

type AssetReferenceInput = {
  bucket?: string | null;
  objectKey?: string | null;
  url?: string | null;
  source: MediaAssetSource;
  kind?: MediaAssetKind;
  mimeType?: string | null;
  size?: number | null;
  title?: string | null;
};

type UploadAssetOptions = {
  source: MediaAssetSource;
  bucketConfigKey: string;
  defaultBucket: string;
  folder: string;
  expectedKind?: MediaAssetKind;
  title?: string | null;
  mismatchErrorCode?: string;
  mismatchMessage?: string;
};

type ProductImageAssetSnapshot = {
  id: string;
  bucket: string;
  objectKey: string;
  url: string;
  mimeType: string;
  size: number;
  title: string;
};

@Injectable()
export class MediaService implements OnModuleInit {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(ConfigService) private readonly config: ConfigService,
    @Inject(MINIO_CLIENT) private readonly minio: Client,
  ) {}

  async onModuleInit(): Promise<void> {
    const buckets = new Set([
      this.config.get('MINIO_BUCKET_PRODUCTS', 'product-images'),
      this.config.get('MINIO_BUCKET_MEDIA', 'media-assets'),
    ]);

    for (const bucket of buckets) {
      try {
        await ensureBucketWithPublicRead(this.minio, bucket);
      } catch (err) {
        this.logger.warn(
          `Media bucket public read policy could not be applied (${bucket}): ${err instanceof Error ? err.message : err}`,
        );
      }
    }
  }

  async upload(
    file: Express.Multer.File | undefined,
    dto: UploadMediaDto,
    actor?: AuthUser,
  ) {
    const asset = await this.createAssetFromUpload(file, {
      source: MediaAssetSource.PRODUCT_UPLOAD,
      bucketConfigKey: 'MINIO_BUCKET_PRODUCTS',
      defaultBucket: 'product-images',
      folder: dto.folder ?? 'products',
      expectedKind: MediaAssetKind.IMAGE,
      title: dto.altText ?? file?.originalname,
    });

    return this.createProductImageUsage(asset, dto, actor, 'media.upload');
  }

  async get(id: string) {
    const media = await this.prisma.productImage.findFirst({ where: { id, deletedAt: null } });
    if (!media) {
      throw new AppException(ERROR_CODES.MEDIA_NOT_FOUND, 'Media not found', HttpStatus.NOT_FOUND);
    }
    return media;
  }

  async remove(id: string, actor?: AuthUser) {
    const current = await this.get(id);
    const removed = await this.prisma.productImage.update({
      where: { id },
      data: { deletedAt: new Date(), isPrimary: false },
    });

    await this.audit.log({
      actorId: actor?.sub,
      action: 'media.detach-product-image',
      entityType: 'ProductImage',
      entityId: current.id,
      oldValues: {
        productId: current.productId,
        mediaAssetId: current.mediaAssetId,
        isPrimary: current.isPrimary,
      } as Prisma.InputJsonValue,
      newValues: {
        deletedAt: removed.deletedAt?.toISOString() ?? null,
      } as Prisma.InputJsonValue,
    });

    return removed;
  }

  async listAssets(query: QueryMediaAssetsDto) {
    const { page, limit } = normalizePagination(query.page, query.limit);
    const where: Prisma.MediaAssetWhereInput = {
      deletedAt: null,
      ...(query.kind ? { kind: query.kind } : {}),
      ...(query.source ? { source: query.source } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { objectKey: { contains: query.search, mode: 'insensitive' } },
              { mimeType: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...this.usageWhere(query.usageStatus),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.mediaAsset.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          productImages: {
            where: { deletedAt: null },
            select: { id: true },
          },
          desktopBannerUsages: {
            where: { deletedAt: null },
            select: { id: true },
          },
          mobileBannerUsages: {
            where: { deletedAt: null },
            select: { id: true },
          },
        },
      }),
      this.prisma.mediaAsset.count({ where }),
    ]);

    return {
      items: items.map((item) => this.mapAssetListRow(item)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getAssetDetail(id: string) {
    const asset = await this.prisma.mediaAsset.findFirst({
      where: { id, deletedAt: null },
      include: {
        productImages: {
          where: {
            deletedAt: null,
            product: { deletedAt: null },
          },
          select: {
            id: true,
            productId: true,
            altText: true,
            sortOrder: true,
            isPrimary: true,
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        desktopBannerUsages: {
          where: { deletedAt: null },
          select: {
            id: true,
            title: true,
            isActive: true,
          },
        },
        mobileBannerUsages: {
          where: { deletedAt: null },
          select: {
            id: true,
            title: true,
            isActive: true,
          },
        },
      },
    });

    if (!asset) {
      throw new AppException(ERROR_CODES.MEDIA_NOT_FOUND, 'Media asset not found', HttpStatus.NOT_FOUND);
    }

    const summary = this.mapAssetUsageSummary(asset);

    return {
      id: asset.id,
      kind: asset.kind,
      source: asset.source,
      bucket: asset.bucket,
      objectKey: asset.objectKey,
      url: asset.url,
      mimeType: asset.mimeType,
      size: asset.size,
      title: asset.title,
      deletedAt: asset.deletedAt,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
      usage: {
        ...summary,
        refs: [
          ...asset.productImages.map((image) => ({
            type: 'PRODUCT_IMAGE' as const,
            id: image.id,
            productId: image.product.id,
            productName: image.product.name,
            productSlug: image.product.slug,
            altText: image.altText,
            sortOrder: image.sortOrder,
            isPrimary: image.isPrimary,
          })),
          ...asset.desktopBannerUsages.map((banner) => ({
            type: 'BANNER_DESKTOP' as const,
            id: banner.id,
            bannerId: banner.id,
            bannerTitle: banner.title,
            isActive: banner.isActive,
          })),
          ...asset.mobileBannerUsages.map((banner) => ({
            type: 'BANNER_MOBILE' as const,
            id: banner.id,
            bannerId: banner.id,
            bannerTitle: banner.title,
            isActive: banner.isActive,
          })),
        ],
      },
    };
  }

  async uploadAsset(
    file: Express.Multer.File | undefined,
    dto: UploadMediaAssetDto,
    actor?: AuthUser,
  ) {
    const asset = await this.createAssetFromUpload(file, {
      source: MediaAssetSource.GALLERY_UPLOAD,
      bucketConfigKey: 'MINIO_BUCKET_MEDIA',
      defaultBucket: 'media-assets',
      folder: dto.folder ?? 'gallery',
      title: dto.title ?? file?.originalname,
    });

    await this.audit.log({
      actorId: actor?.sub,
      action: 'media.assets.upload',
      entityType: 'MediaAsset',
      entityId: asset.id,
        newValues: this.mediaAssetAuditValues(asset) as Prisma.InputJsonValue,
    });

    return this.mapAssetListRow({
      ...asset,
      productImages: [],
      desktopBannerUsages: [],
      mobileBannerUsages: [],
    });
  }

  async attachProductImage(
    assetId: string,
    dto: AttachMediaAssetProductImageDto,
    actor?: AuthUser,
  ) {
    const asset = await this.getMediaAssetSnapshotOrThrow(assetId);
    if (asset.kind !== MediaAssetKind.IMAGE) {
      throw new AppException(
        ERROR_CODES.MEDIA_ASSET_NOT_IMAGE,
        'Only image assets can be attached as product images',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.createProductImageUsage(asset, dto, actor, 'media.attach');
  }

  async deleteAsset(id: string, actor?: AuthUser) {
    const asset = await this.prisma.mediaAsset.findFirst({
      where: { id, deletedAt: null },
      include: {
        productImages: {
          where: { deletedAt: null },
          select: {
            id: true,
            productId: true,
          },
        },
        desktopBannerUsages: {
          where: { deletedAt: null },
          select: {
            id: true,
            title: true,
          },
        },
        mobileBannerUsages: {
          where: { deletedAt: null },
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!asset) {
      throw new AppException(ERROR_CODES.MEDIA_NOT_FOUND, 'Media asset not found', HttpStatus.NOT_FOUND);
    }

    const detachedAt = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.productImage.updateMany({
        where: { mediaAssetId: id, deletedAt: null },
        data: { deletedAt: detachedAt, isPrimary: false },
      });

      await tx.banner.updateMany({
        where: { desktopMediaAssetId: id, deletedAt: null },
        data: {
          desktopMediaAssetId: null,
          desktopMediaUrl: null,
          desktopMediaBucket: null,
          desktopMediaObjectKey: null,
          isActive: false,
        },
      });

      await tx.banner.updateMany({
        where: { mobileMediaAssetId: id, deletedAt: null },
        data: {
          mobileMediaAssetId: null,
          mobileMediaUrl: null,
          mobileMediaBucket: null,
          mobileMediaObjectKey: null,
          isActive: false,
        },
      });
    });

    await this.removeStoredObject(asset.bucket, asset.objectKey);

    const deleted = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.mediaAsset.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      await this.audit.log(
        {
          actorId: actor?.sub,
          action: 'media.assets.delete',
          entityType: 'MediaAsset',
          entityId: id,
          oldValues: {
            ...this.mediaAssetAuditValues(asset),
            usage: this.mapAssetUsageSummary(asset),
          } as Prisma.InputJsonValue,
          newValues: {
            deletedAt: updated.deletedAt?.toISOString() ?? null,
            detachedProductImageCount: asset.productImages.length,
            detachedBannerCount: uniqueCount([
              ...asset.desktopBannerUsages.map((banner) => banner.id),
              ...asset.mobileBannerUsages.map((banner) => banner.id),
            ]),
            detachedBannerSlotCount:
              asset.desktopBannerUsages.length + asset.mobileBannerUsages.length,
          } as Prisma.InputJsonValue,
        },
        tx,
      );

      return updated;
    });

    return {
      id: deleted.id,
      title: deleted.title,
      deletedAt: deleted.deletedAt,
      detachedProductImageCount: asset.productImages.length,
      detachedBannerCount: uniqueCount([
        ...asset.desktopBannerUsages.map((banner) => banner.id),
        ...asset.mobileBannerUsages.map((banner) => banner.id),
      ]),
      detachedBannerSlotCount:
        asset.desktopBannerUsages.length + asset.mobileBannerUsages.length,
    };
  }

  async createAssetFromUpload(
    file: Express.Multer.File | undefined,
    options: UploadAssetOptions,
  ) {
    if (!file?.buffer) {
      throw new AppException(ERROR_CODES.VALIDATION_FAILED, 'File is required', HttpStatus.BAD_REQUEST);
    }

    const detected = detectBannerMedia(file.buffer);
    if (!detected) {
      throw new AppException(
        ERROR_CODES.MEDIA_INVALID_TYPE,
        'Unsupported media type',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (options.expectedKind && detected.kind !== options.expectedKind) {
      throw new AppException(
        options.mismatchErrorCode ??
          (options.expectedKind === MediaAssetKind.IMAGE
            ? ERROR_CODES.MEDIA_ASSET_NOT_IMAGE
            : ERROR_CODES.MEDIA_INVALID_TYPE),
        options.mismatchMessage ??
          (options.expectedKind === MediaAssetKind.IMAGE
            ? 'Only image files are supported for this action'
            : 'Unsupported media type'),
        HttpStatus.BAD_REQUEST,
      );
    }

    const maxBytes = detected.kind === MediaAssetKind.IMAGE ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
    if (file.size > maxBytes) {
      throw new AppException(
        ERROR_CODES.MEDIA_FILE_TOO_LARGE,
        'File is too large',
        HttpStatus.BAD_REQUEST,
      );
    }

    const bucket = this.config.get(options.bucketConfigKey, options.defaultBucket);
    await ensureBucketWithPublicRead(this.minio, bucket);

    const folder = normalizeFolder(options.folder);
    const objectKey = `${folder}/${randomUUID()}${extensionForMime(detected.mime)}`;

    try {
      await this.minio.putObject(bucket, objectKey, file.buffer, file.size, {
        'Content-Type': detected.mime,
      });
    } catch {
      throw new AppException(
        ERROR_CODES.MEDIA_UPLOAD_FAILED,
        'Media upload failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const title = normalizeTitle(options.title) ?? normalizeTitle(file.originalname) ?? objectKey.split('/').pop() ?? 'media';

    try {
      return await this.prisma.mediaAsset.create({
        data: {
          kind: detected.kind,
          source: options.source,
          bucket,
          objectKey,
          url: this.publicObjectUrl(bucket, objectKey),
          mimeType: detected.mime,
          size: file.size,
          title,
        },
      });
    } catch {
      await this.removeStoredObjectBestEffort(bucket, objectKey);
      throw new AppException(
        ERROR_CODES.MEDIA_UPLOAD_FAILED,
        'Media upload failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async resolveAssetReference(input: AssetReferenceInput) {
    let bucket = input.bucket ?? null;
    let objectKey = input.objectKey ?? null;

    if ((!bucket || !objectKey) && input.url) {
      const parsed = parseMinioPublicObjectUrl(input.url, this.allowedBuckets());
      if (parsed) {
        bucket = parsed.bucket;
        objectKey = parsed.objectKey;
      }
    }

    if (!bucket || !objectKey) {
      return null;
    }

    const mimeType = input.mimeType ?? mimeFromObjectKey(objectKey, input.kind);
    const kind =
      input.kind ??
      (mimeType.startsWith('video/') ? MediaAssetKind.VIDEO : MediaAssetKind.IMAGE);
    const title =
      normalizeTitle(input.title) ??
      objectKey.split('/').pop() ??
      `${kind === MediaAssetKind.VIDEO ? 'video' : 'image'}-asset`;
    const url = input.url ?? this.publicObjectUrl(bucket, objectKey);
    const size = input.size ?? 0;

    const existing = await this.prisma.mediaAsset.findUnique({
      where: {
        bucket_objectKey: {
          bucket,
          objectKey,
        },
      },
    });

    if (existing) {
      return this.prisma.mediaAsset.update({
        where: { id: existing.id },
        data: {
          deletedAt: null,
          kind: input.kind ?? existing.kind,
          url: input.url ?? existing.url,
          mimeType: input.mimeType ?? existing.mimeType,
          size: input.size ?? existing.size,
          title: normalizeTitle(input.title) ?? existing.title,
        },
      });
    }

    return this.prisma.mediaAsset.create({
      data: {
        kind,
        source: input.source,
        bucket,
        objectKey,
        url,
        mimeType,
        size,
        title,
      },
    });
  }

  private async createProductImageUsage(
    asset: ProductImageAssetSnapshot,
    dto: Pick<AttachMediaAssetProductImageDto, 'productId' | 'altText' | 'sortOrder' | 'isPrimary'>,
    actor?: AuthUser,
    action = 'media.attach',
  ) {
    await this.assertProduct(dto.productId);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isPrimary) {
        await tx.productImage.updateMany({
          where: { productId: dto.productId, deletedAt: null },
          data: { isPrimary: false },
        });
      }

      const created = await tx.productImage.create({
        data: {
          productId: dto.productId,
          mediaAssetId: asset.id,
          bucket: asset.bucket,
          objectKey: asset.objectKey,
          url: asset.url,
          mimeType: asset.mimeType,
          size: asset.size,
          altText: dto.altText,
          sortOrder: dto.sortOrder ?? 0,
          isPrimary: dto.isPrimary ?? false,
        },
      });

      await this.audit.log(
        {
          actorId: actor?.sub,
          action,
          entityType: 'ProductImage',
          entityId: created.id,
          newValues: {
            productId: created.productId,
            mediaAssetId: asset.id,
            isPrimary: created.isPrimary,
            altText: created.altText,
          } as Prisma.InputJsonValue,
        },
        tx,
      );

      return created;
    });
  }

  private async getMediaAssetSnapshotOrThrow(id: string): Promise<ProductImageAssetSnapshot & { kind: MediaAssetKind }> {
    const asset = await this.prisma.mediaAsset.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        kind: true,
        bucket: true,
        objectKey: true,
        url: true,
        mimeType: true,
        size: true,
        title: true,
      },
    });

    if (!asset) {
      throw new AppException(ERROR_CODES.MEDIA_NOT_FOUND, 'Media asset not found', HttpStatus.NOT_FOUND);
    }

    return asset;
  }

  private async assertProduct(productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, deletedAt: null },
      select: { id: true },
    });

    if (!product) {
      throw new AppException(ERROR_CODES.PRODUCT_NOT_FOUND, 'Product not found', HttpStatus.NOT_FOUND);
    }
  }

  private usageWhere(status?: MediaUsageStatus): Prisma.MediaAssetWhereInput {
    if (!status || status === MediaUsageStatus.ALL) {
      return {};
    }

    if (status === MediaUsageStatus.USED) {
      return {
        OR: [
          { productImages: { some: { deletedAt: null } } },
          { desktopBannerUsages: { some: { deletedAt: null } } },
          { mobileBannerUsages: { some: { deletedAt: null } } },
        ],
      };
    }

    return {
      AND: [
        { productImages: { none: { deletedAt: null } } },
        { desktopBannerUsages: { none: { deletedAt: null } } },
        { mobileBannerUsages: { none: { deletedAt: null } } },
      ],
    };
  }

  private mapAssetListRow(asset: {
    id: string;
    kind: MediaAssetKind;
    source: MediaAssetSource;
    bucket: string;
    objectKey: string;
    url: string;
    mimeType: string;
    size: number;
    title: string;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    productImages: Array<{ id: string }>;
    desktopBannerUsages: Array<{ id: string }>;
    mobileBannerUsages: Array<{ id: string }>;
  }) {
    return {
      id: asset.id,
      kind: asset.kind,
      source: asset.source,
      bucket: asset.bucket,
      objectKey: asset.objectKey,
      url: asset.url,
      mimeType: asset.mimeType,
      size: asset.size,
      title: asset.title,
      deletedAt: asset.deletedAt,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
      usage: this.mapAssetUsageSummary(asset),
    };
  }

  private mapAssetUsageSummary(asset: {
    productImages: Array<{ id: string }>;
    desktopBannerUsages: Array<{ id: string }>;
    mobileBannerUsages: Array<{ id: string }>;
  }) {
    const bannerIds = new Set([
      ...asset.desktopBannerUsages.map((banner) => banner.id),
      ...asset.mobileBannerUsages.map((banner) => banner.id),
    ]);
    const bannerSlotCount =
      asset.desktopBannerUsages.length + asset.mobileBannerUsages.length;
    const productImageCount = asset.productImages.length;

    return {
      productImageCount,
      bannerCount: bannerIds.size,
      bannerSlotCount,
      totalUsageCount: productImageCount + bannerSlotCount,
      isUsed: productImageCount > 0 || bannerSlotCount > 0,
    };
  }

  private mediaAssetAuditValues(asset: {
    id: string;
    kind: MediaAssetKind;
    source?: MediaAssetSource;
    bucket: string;
    objectKey: string;
    url: string;
    mimeType: string;
    size: number;
    title: string;
  }) {
    return {
      id: asset.id,
      kind: asset.kind,
      source: asset.source ?? null,
      bucket: asset.bucket,
      objectKey: asset.objectKey,
      url: asset.url,
      mimeType: asset.mimeType,
      size: asset.size,
      title: asset.title,
    };
  }

  private allowedBuckets(): Set<string> {
    return new Set([
      this.config.get('MINIO_BUCKET_BANNERS', 'banners'),
      this.config.get('MINIO_BUCKET_PRODUCTS', 'product-images'),
      this.config.get('MINIO_BUCKET_MEDIA', 'media-assets'),
    ]);
  }

  private publicObjectUrl(bucket: string, objectKey: string): string {
    return `${this.config.get('MINIO_PUBLIC_URL', 'http://localhost:9000').replace(/\/$/, '')}/${bucket}/${objectKey}`;
  }

  private async removeStoredObject(bucket: string, objectKey: string) {
    try {
      await this.minio.removeObject(bucket, objectKey);
    } catch {
      throw new AppException(
        ERROR_CODES.MEDIA_DELETE_FAILED,
        'Media delete failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async removeStoredObjectBestEffort(bucket: string, objectKey: string) {
    try {
      await this.minio.removeObject(bucket, objectKey);
    } catch (err) {
      this.logger.warn(
        `MinIO removeObject failed (${bucket}/${objectKey}): ${err instanceof Error ? err.message : err}`,
      );
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

function normalizeFolder(folder: string): string {
  const normalized = folder.trim().replace(/^\/+|\/+$/g, '');
  if (!normalized || normalized.includes('..')) {
    throw new AppException(ERROR_CODES.VALIDATION_FAILED, 'Invalid media folder', HttpStatus.BAD_REQUEST);
  }
  return normalized;
}

function normalizeTitle(value?: string | null): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function mimeFromObjectKey(objectKey: string, kind?: MediaAssetKind): string {
  const lower = objectKey.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.mp4')) return 'video/mp4';
  if (lower.endsWith('.webm')) return 'video/webm';
  return kind === MediaAssetKind.VIDEO ? 'video/mp4' : 'image/jpeg';
}

function uniqueCount(values: string[]): number {
  return new Set(values).size;
}
