import { BannerMediaType } from '@prisma/client';
import { BannersService } from './banners.service';
import { ERROR_CODES } from '../common/constants/error-codes';
import { AppException } from '../common/exceptions/app.exception';

describe('BannersService', () => {
  const audit = { log: jest.fn() };
  const config = { get: jest.fn((k: string, d?: string) => (k === 'MINIO_BUCKET_BANNERS' ? 'banners' : d)) };
  const minio = {
    bucketExists: jest.fn().mockResolvedValue(true),
    putObject: jest.fn(),
    removeObject: jest.fn(),
    setBucketPolicy: jest.fn().mockResolvedValue(undefined),
    makeBucket: jest.fn().mockResolvedValue(undefined),
  };

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
    const service = new BannersService(prisma as never, audit as never, configWithPublic as never, minio as never);
    const rows = await service.listHome();
    expect(rows[0].desktopMediaUrl).toBe('http://localhost:3003/api/v1/files/banners/home%2Fdesktop%2Fx.png');
    expect(rows[0].mobileMediaUrl).toBe('http://localhost:3003/api/v1/files/banners/home%2Fmobile%2Fy.png');
  });

  it('listHome filters active, non-deleted, in schedule window', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = { banner: { findMany, aggregate: jest.fn() } };
    const service = new BannersService(prisma as never, audit as never, config as never, minio as never);
    await service.listHome();
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          isActive: true,
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
    const service = new BannersService(prisma as never, audit as never, config as never, minio as never);
    await service.reorder(ids);
    expect(transaction).toHaveBeenCalled();
    expect(update).toHaveBeenCalled();
  });

  it('reorder rejects when id list incomplete', async () => {
    const findMany = jest.fn().mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
    const prisma = { banner: { findMany, aggregate: jest.fn() }, $transaction: jest.fn() };
    const service = new BannersService(prisma as never, audit as never, config as never, minio as never);
    try {
      await service.reorder(['a']);
      throw new Error('expected error');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).getResponse()).toMatchObject({ code: ERROR_CODES.BANNER_REORDER_INVALID });
    }
  });

  it('uploadMedia rejects unknown binary', async () => {
    const prisma = { banner: { aggregate: jest.fn() } };
    const service = new BannersService(prisma as never, audit as never, config as never, minio as never);
    try {
      await service.uploadMedia({ buffer: Buffer.from('not-media'), size: 10 } as Express.Multer.File, 'desktop');
      throw new Error('expected error');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).getResponse()).toMatchObject({ code: ERROR_CODES.MEDIA_INVALID_TYPE });
    }
  });

  it('uploadMedia rejects when expectKind mismatches detected file', async () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const prisma = { banner: { aggregate: jest.fn() } };
    const service = new BannersService(prisma as never, audit as never, config as never, minio as never);
    try {
      await service.uploadMedia(
        { buffer: png, size: png.length } as Express.Multer.File,
        'mobile',
        BannerMediaType.VIDEO,
      );
      throw new Error('expected error');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).getResponse()).toMatchObject({ code: ERROR_CODES.BANNER_MEDIA_MISMATCH });
    }
  });
});
