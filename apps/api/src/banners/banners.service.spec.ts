import { BannerMediaType } from '@prisma/client';
import { BannersService } from './banners.service';
import { ERROR_CODES } from '../common/constants/error-codes';
import { AppException } from '../common/exceptions/app.exception';

describe('BannersService', () => {
  const audit = { log: jest.fn() };
  const media = {
    createAssetFromUpload: jest.fn(),
    resolveAssetReference: jest.fn(),
  };
  const config = {
    get: jest.fn((k: string, d?: string) => {
      if (k === 'MINIO_BUCKET_BANNERS') return 'banners';
      if (k === 'MINIO_BUCKET_PRODUCTS') return 'product-images';
      if (k === 'MINIO_BUCKET_MEDIA') return 'media-assets';
      return d;
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('listHome rewrites stored MinIO URLs to file proxy when bucket/objectKey missing in DB', async () => {
    const configWithPublic = {
      get: jest.fn((k: string, d?: string) => {
        if (k === 'MINIO_BUCKET_BANNERS') return 'banners';
        if (k === 'MINIO_BUCKET_PRODUCTS') return 'product-images';
        if (k === 'PUBLIC_API_URL') return 'http://localhost:3003';
        return d;
      }),
    };
    const findMany = jest.fn().mockResolvedValue([
      {
        id: '1',
        title: 't',
        subtitle: null,
        description: null,
        mediaType: BannerMediaType.IMAGE,
        desktopMediaUrl: 'http://localhost:9000/banners/home/desktop/x.png',
        desktopMediaBucket: null,
        desktopMediaObjectKey: null,
        mobileMediaUrl: 'http://localhost:9000/banners/home/mobile/y.png',
        mobileMediaBucket: null,
        mobileMediaObjectKey: null,
        buttonText: null,
        buttonUrl: null,
        sortOrder: 0,
      },
    ]);
    const prisma = { banner: { findMany, aggregate: jest.fn() } };
    const service = new BannersService(
      prisma as never,
      audit as never,
      media as never,
      configWithPublic as never,
    );
    const rows = await service.listHome();
    expect(rows[0].desktopMediaUrl).toBe('http://localhost:3003/api/v1/files/banners/home%2Fdesktop%2Fx.png');
    expect(rows[0].mobileMediaUrl).toBe('http://localhost:3003/api/v1/files/banners/home%2Fmobile%2Fy.png');
  });

  it('listHome filters active, non-deleted, in schedule window', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = { banner: { findMany, aggregate: jest.fn() } };
    const service = new BannersService(prisma as never, audit as never, media as never, config as never);
    await service.listHome();
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          isActive: true,
          desktopMediaUrl: { not: null },
          mobileMediaUrl: { not: null },
          AND: expect.any(Array),
        }),
        orderBy: { sortOrder: 'asc' },
      }),
    );
  });

  it('reorder runs transaction when id set matches', async () => {
    const ids = ['a', 'b'];
    const findMany = jest.fn().mockResolvedValue(ids.map((id) => ({ id })));
    const update = jest.fn().mockResolvedValue({});
    const transaction = jest.fn(async (arg: unknown) => {
      if (typeof arg === 'function') return (arg as (p: never) => Promise<unknown>)({ banner: { update } } as never);
      return Promise.all(arg as Promise<unknown>[]);
    });
    const prisma = { banner: { findMany, update, aggregate: jest.fn() }, $transaction: transaction };
    const service = new BannersService(prisma as never, audit as never, media as never, config as never);
    await service.reorder(ids);
    expect(transaction).toHaveBeenCalled();
    expect(update).toHaveBeenCalled();
  });

  it('reorder rejects when id list incomplete', async () => {
    const findMany = jest.fn().mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
    const prisma = { banner: { findMany, aggregate: jest.fn() }, $transaction: jest.fn() };
    const service = new BannersService(prisma as never, audit as never, media as never, config as never);
    try {
      await service.reorder(['a']);
      throw new Error('expected error');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).getResponse()).toMatchObject({ code: ERROR_CODES.BANNER_REORDER_INVALID });
    }
  });

  it('create links uploaded media assets into banner references', async () => {
    media.resolveAssetReference
      .mockResolvedValueOnce({ id: 'asset-desktop' })
      .mockResolvedValueOnce({ id: 'asset-mobile' });
    const create = jest.fn().mockResolvedValue({
      id: 'banner-1',
      title: 'Hero',
      subtitle: null,
      description: null,
      mediaType: BannerMediaType.IMAGE,
      desktopMediaUrl: 'http://localhost:9000/banners/home/desktop/x.png',
      desktopMediaBucket: 'banners',
      desktopMediaObjectKey: 'home/desktop/x.png',
      desktopMediaAssetId: 'asset-desktop',
      mobileMediaUrl: 'http://localhost:9000/banners/home/mobile/y.png',
      mobileMediaBucket: 'banners',
      mobileMediaObjectKey: 'home/mobile/y.png',
      mobileMediaAssetId: 'asset-mobile',
      buttonText: null,
      buttonUrl: null,
      sortOrder: 0,
      isActive: true,
      startsAt: null,
      endsAt: null,
      deletedAt: null,
      createdAt: new Date('2026-01-01T10:00:00.000Z'),
      updatedAt: new Date('2026-01-01T10:00:00.000Z'),
    });
    const prisma = {
      banner: {
        create,
        aggregate: jest.fn().mockResolvedValue({ _max: { sortOrder: null } }),
      },
    };
    const service = new BannersService(prisma as never, audit as never, media as never, config as never);

    await service.create({
      title: 'Hero',
      mediaType: BannerMediaType.IMAGE,
      desktopMediaUrl: 'http://localhost:9000/banners/home/desktop/x.png',
      desktopMediaBucket: 'banners',
      desktopMediaObjectKey: 'home/desktop/x.png',
      mobileMediaUrl: 'http://localhost:9000/banners/home/mobile/y.png',
      mobileMediaBucket: 'banners',
      mobileMediaObjectKey: 'home/mobile/y.png',
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          desktopMediaAssetId: 'asset-desktop',
          mobileMediaAssetId: 'asset-mobile',
        }),
      }),
    );
  });

  it('uploadMedia returns shared asset metadata for banner uploads', async () => {
    media.createAssetFromUpload.mockResolvedValue({
      id: 'asset-1',
      kind: 'VIDEO',
      bucket: 'banners',
      objectKey: 'home/mobile/banner.mp4',
      url: 'http://localhost:9000/banners/home/mobile/banner.mp4',
      mimeType: 'video/mp4',
    });
    const prisma = { banner: { aggregate: jest.fn() } };
    const service = new BannersService(prisma as never, audit as never, media as never, config as never);

    const result = await service.uploadMedia(
      { originalname: 'banner.mp4' } as Express.Multer.File,
      'mobile',
      BannerMediaType.VIDEO,
    );

    expect(media.createAssetFromUpload).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        source: 'BANNER_UPLOAD',
        folder: 'home/mobile',
      }),
    );
    expect(result).toMatchObject({
      assetId: 'asset-1',
      bucket: 'banners',
      objectKey: 'home/mobile/banner.mp4',
      detectedMediaType: BannerMediaType.VIDEO,
      mime: 'video/mp4',
    });
  });
});
