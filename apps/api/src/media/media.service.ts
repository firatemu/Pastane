import { HttpStatus, Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import type { Client } from 'minio';
import { ERROR_CODES } from '../common/constants/error-codes';
import { AppException } from '../common/exceptions/app.exception';
import { ensureBucketWithPublicRead } from '../common/utils/minio-public-bucket.util';
import { detectImageMime } from '../common/utils/mime.util';
import { PrismaService } from '../database/prisma.service';
import type { UploadMediaDto } from './dto/upload-media.dto';
import { MINIO_CLIENT } from './providers/minio.provider';

@Injectable()
export class MediaService implements OnModuleInit {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ConfigService) private readonly config: ConfigService,
    @Inject(MINIO_CLIENT) private readonly minio: Client,
  ) {}

  async onModuleInit(): Promise<void> {
    const bucket = this.config.get('MINIO_BUCKET_PRODUCTS', 'product-images');
    try {
      await ensureBucketWithPublicRead(this.minio, bucket);
    } catch (err) {
      this.logger.warn(
        `Product images bucket public read policy could not be applied (${bucket}): ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  async upload(file: Express.Multer.File | undefined, dto: UploadMediaDto) {
    if (!file) throw new AppException(ERROR_CODES.VALIDATION_FAILED, 'File is required', HttpStatus.BAD_REQUEST);
    if (file.size > 5 * 1024 * 1024) throw new AppException(ERROR_CODES.MEDIA_FILE_TOO_LARGE, 'File is too large', HttpStatus.BAD_REQUEST);
    const mime = detectImageMime(file.buffer);
    if (!mime) throw new AppException(ERROR_CODES.MEDIA_INVALID_TYPE, 'Unsupported media type', HttpStatus.BAD_REQUEST);
    const product = await this.prisma.product.findFirst({ where: { id: dto.productId, deletedAt: null } });
    if (!product) throw new AppException(ERROR_CODES.PRODUCT_NOT_FOUND, 'Product not found', HttpStatus.NOT_FOUND);
    const bucket = this.config.get('MINIO_BUCKET_PRODUCTS', 'product-images');
    await ensureBucketWithPublicRead(this.minio, bucket);
    const extension = mime === 'image/jpeg' ? '.jpg' : mime === 'image/png' ? '.png' : mime === 'image/gif' ? '.gif' : '.webp';
    const key = `${dto.folder ?? 'products'}/${randomUUID()}${extension}`;
    try {
      await this.minio.putObject(bucket, key, file.buffer, file.size, { 'Content-Type': mime });
    } catch {
      throw new AppException(ERROR_CODES.MEDIA_UPLOAD_FAILED, 'Media upload failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    if (dto.isPrimary) {
      await this.prisma.productImage.updateMany({ where: { productId: dto.productId, deletedAt: null }, data: { isPrimary: false } });
    }
    return this.prisma.productImage.create({
      data: {
        productId: dto.productId,
        bucket,
        objectKey: key,
        url: `${this.config.get('MINIO_PUBLIC_URL', 'http://localhost:9000')}/${bucket}/${key}`,
        mimeType: mime,
        size: file.size,
        altText: dto.altText,
        sortOrder: dto.sortOrder ?? 0,
        isPrimary: dto.isPrimary ?? false,
      },
    });
  }

  async get(id: string) {
    const x = await this.prisma.productImage.findFirst({ where: { id, deletedAt: null } });
    if (!x) throw new AppException(ERROR_CODES.MEDIA_NOT_FOUND, 'Media not found', HttpStatus.NOT_FOUND);
    return x;
  }

  async remove(id: string) {
    const x = await this.get(id);
    try {
      if (x.bucket && x.objectKey) await this.minio.removeObject(x.bucket, x.objectKey);
    } catch {
      throw new AppException(ERROR_CODES.MEDIA_DELETE_FAILED, 'Media delete failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    return this.prisma.productImage.update({ where: { id }, data: { deletedAt: new Date(), isPrimary: false } });
  }
}
