import { MediaAssetKind, MediaAssetSource, RoleType } from '@prisma/client';
import { AppException } from '../common/exceptions/app.exception';
import { ERROR_CODES } from '../common/constants/error-codes';
import type { AuthUser } from '../common/types/auth-user.type';
import { MediaUsageStatus } from './dto/query-media-assets.dto';
import { MediaService } from './media.service';

function createAuthUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    sub: 'actor-1',
    phone: '905551111111',
    role: RoleType.ADMIN,
    permissions: ['media.view', 'media.upload', 'media.delete', 'media.attach'],
    ...overrides,
  };
}

function createService() {
  const prisma = {
    product: {
      findFirst: jest.fn(),
    },
    productImage: {
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
    mediaAsset: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    banner: {
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  prisma.$transaction.mockImplementation(async (arg: unknown): Promise<unknown> => {
    if (typeof arg === 'function') {
      return arg(prisma);
    }
    return Promise.all(arg as Promise<unknown>[]);
  });

  const audit = {
    log: jest.fn(),
  };

  const config = {
    get: jest.fn((key: string, fallback?: string) => {
      if (key === 'MINIO_BUCKET_PRODUCTS') return 'product-images';
      if (key === 'MINIO_BUCKET_MEDIA') return 'media-assets';
      if (key === 'MINIO_BUCKET_BANNERS') return 'banners';
      if (key === 'MINIO_PUBLIC_URL') return 'http://localhost:9000';
      return fallback;
    }),
  };

  const minio = {
    bucketExists: jest.fn().mockResolvedValue(true),
    putObject: jest.fn().mockResolvedValue(undefined),
    removeObject: jest.fn().mockResolvedValue(undefined),
    setBucketPolicy: jest.fn().mockResolvedValue(undefined),
    makeBucket: jest.fn().mockResolvedValue(undefined),
  };

  return {
    prisma,
    audit,
    config,
    minio,
    service: new MediaService(prisma as never, audit as never, config as never, minio as never),
  };
}

describe('MediaService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists media assets with usage summaries', async () => {
    const { prisma, service } = createService();
    prisma.mediaAsset.findMany.mockResolvedValue([
      {
        id: 'asset-1',
        kind: MediaAssetKind.IMAGE,
        source: MediaAssetSource.GALLERY_UPLOAD,
        bucket: 'media-assets',
        objectKey: 'gallery/asset-1.png',
        url: 'http://localhost:9000/media-assets/gallery/asset-1.png',
        mimeType: 'image/png',
        size: 123,
        title: 'Asset 1',
        deletedAt: null,
        createdAt: new Date('2026-01-01T10:00:00.000Z'),
        updatedAt: new Date('2026-01-01T10:00:00.000Z'),
        productImages: [{ id: 'pi-1' }],
        desktopBannerUsages: [{ id: 'banner-1' }],
        mobileBannerUsages: [],
      },
    ]);
    prisma.mediaAsset.count.mockResolvedValue(1);

    const result = await service.listAssets({ usageStatus: MediaUsageStatus.USED });

    expect(prisma.mediaAsset.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.any(Array),
        }),
      }),
    );
    expect(result.meta).toMatchObject({ page: 1, limit: 20, total: 1, totalPages: 1 });
    expect(result.items[0]).toMatchObject({
      id: 'asset-1',
      usage: {
        productImageCount: 1,
        bannerCount: 1,
        bannerSlotCount: 1,
        totalUsageCount: 2,
        isUsed: true,
      },
    });
  });

  it('uploads a gallery asset into the shared media pool', async () => {
    const { prisma, audit, minio, service } = createService();
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    prisma.mediaAsset.create.mockResolvedValue({
      id: 'asset-1',
      kind: MediaAssetKind.IMAGE,
      source: MediaAssetSource.GALLERY_UPLOAD,
      bucket: 'media-assets',
      objectKey: 'gallery/asset-1.png',
      url: 'http://localhost:9000/media-assets/gallery/asset-1.png',
      mimeType: 'image/png',
      size: png.length,
      title: 'Hero',
      deletedAt: null,
      createdAt: new Date('2026-01-01T10:00:00.000Z'),
      updatedAt: new Date('2026-01-01T10:00:00.000Z'),
    });

    const uploaded = await service.uploadAsset(
      {
        buffer: png,
        size: png.length,
        originalname: 'hero.png',
      } as Express.Multer.File,
      { folder: 'gallery', title: 'Hero' },
      createAuthUser(),
    );

    expect(minio.putObject).toHaveBeenCalled();
    expect(prisma.mediaAsset.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          source: MediaAssetSource.GALLERY_UPLOAD,
          bucket: 'media-assets',
          title: 'Hero',
        }),
      }),
    );
    expect(audit.log).toHaveBeenCalled();
    expect(uploaded).toMatchObject({
      id: 'asset-1',
      source: MediaAssetSource.GALLERY_UPLOAD,
      usage: {
        totalUsageCount: 0,
        isUsed: false,
      },
    });
  });

  it('attaches an image asset to a product image usage', async () => {
    const { prisma, audit, service } = createService();
    prisma.mediaAsset.findFirst.mockResolvedValue({
      id: 'asset-1',
      kind: MediaAssetKind.IMAGE,
      bucket: 'media-assets',
      objectKey: 'gallery/asset-1.png',
      url: 'http://localhost:9000/media-assets/gallery/asset-1.png',
      mimeType: 'image/png',
      size: 123,
      title: 'Hero',
    });
    prisma.product.findFirst.mockResolvedValue({ id: 'product-1' });
    prisma.productImage.create.mockResolvedValue({
      id: 'image-1',
      productId: 'product-1',
      mediaAssetId: 'asset-1',
      isPrimary: true,
      altText: 'Front',
    });

    const created = await service.attachProductImage(
      'asset-1',
      {
        productId: 'product-1',
        altText: 'Front',
        isPrimary: true,
        sortOrder: 0,
      },
      createAuthUser(),
    );

    expect(prisma.productImage.updateMany).toHaveBeenCalledWith({
      where: { productId: 'product-1', deletedAt: null },
      data: { isPrimary: false },
    });
    expect(prisma.productImage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          mediaAssetId: 'asset-1',
          productId: 'product-1',
          url: 'http://localhost:9000/media-assets/gallery/asset-1.png',
        }),
      }),
    );
    expect(audit.log).toHaveBeenCalled();
    expect(created).toMatchObject({ id: 'image-1', mediaAssetId: 'asset-1' });
  });

  it('detachs usages and soft deletes an asset before final removal', async () => {
    const { prisma, audit, minio, service } = createService();
    prisma.mediaAsset.findFirst.mockResolvedValue({
      id: 'asset-1',
      kind: MediaAssetKind.IMAGE,
      source: MediaAssetSource.PRODUCT_UPLOAD,
      bucket: 'product-images',
      objectKey: 'products/asset-1.png',
      url: 'http://localhost:9000/product-images/products/asset-1.png',
      mimeType: 'image/png',
      size: 123,
      title: 'Asset 1',
      deletedAt: null,
      createdAt: new Date('2026-01-01T10:00:00.000Z'),
      updatedAt: new Date('2026-01-01T10:00:00.000Z'),
      productImages: [{ id: 'pi-1', productId: 'product-1' }],
      desktopBannerUsages: [{ id: 'banner-1', title: 'Desktop Banner' }],
      mobileBannerUsages: [{ id: 'banner-1', title: 'Desktop Banner' }],
    });
    prisma.productImage.updateMany.mockResolvedValue({ count: 1 });
    prisma.banner.updateMany.mockResolvedValue({ count: 1 });
    prisma.mediaAsset.update.mockResolvedValue({
      id: 'asset-1',
      title: 'Asset 1',
      deletedAt: new Date('2026-01-02T10:00:00.000Z'),
    });

    const removed = await service.deleteAsset('asset-1', createAuthUser());

    expect(prisma.productImage.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { mediaAssetId: 'asset-1', deletedAt: null },
      }),
    );
    expect(prisma.banner.updateMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { desktopMediaAssetId: 'asset-1', deletedAt: null },
        data: expect.objectContaining({
          desktopMediaAssetId: null,
          desktopMediaUrl: null,
          isActive: false,
        }),
      }),
    );
    expect(prisma.banner.updateMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { mobileMediaAssetId: 'asset-1', deletedAt: null },
        data: expect.objectContaining({
          mobileMediaAssetId: null,
          mobileMediaUrl: null,
          isActive: false,
        }),
      }),
    );
    expect(minio.removeObject).toHaveBeenCalledWith('product-images', 'products/asset-1.png');
    expect(audit.log).toHaveBeenCalled();
    expect(removed).toMatchObject({
      id: 'asset-1',
      detachedProductImageCount: 1,
      detachedBannerCount: 1,
      detachedBannerSlotCount: 2,
    });
  });

  it('rejects attaching a non-image asset to product images', async () => {
    const { prisma, service } = createService();
    prisma.mediaAsset.findFirst.mockResolvedValue({
      id: 'asset-1',
      kind: MediaAssetKind.VIDEO,
      bucket: 'media-assets',
      objectKey: 'gallery/video-1.mp4',
      url: 'http://localhost:9000/media-assets/gallery/video-1.mp4',
      mimeType: 'video/mp4',
      size: 456,
      title: 'Video',
    });

    try {
      await service.attachProductImage('asset-1', { productId: 'product-1' }, createAuthUser());
      throw new Error('expected error');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).getResponse()).toMatchObject({
        code: ERROR_CODES.MEDIA_ASSET_NOT_IMAGE,
      });
    }
  });
});
