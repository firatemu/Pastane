import { Inject, Injectable, NotFoundException, StreamableFile } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Client } from 'minio';
import { MINIO_CLIENT } from './providers/minio.provider';

function contentTypeForObjectKey(objectKey: string): string {
  const lower = objectKey.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.mp4')) return 'video/mp4';
  if (lower.endsWith('.webm')) return 'video/webm';
  return 'application/octet-stream';
}

@Injectable()
export class PublicFilesService {
  constructor(
    @Inject(ConfigService) private readonly config: ConfigService,
    @Inject(MINIO_CLIENT) private readonly minio: Client,
  ) {}

  private allowedBucket(name: string): boolean {
    const banners = this.config.get('MINIO_BUCKET_BANNERS', 'banners');
    const products = this.config.get('MINIO_BUCKET_PRODUCTS', 'product-images');
    const media = this.config.get('MINIO_BUCKET_MEDIA', 'media-assets');
    return name === banners || name === products || name === media;
  }

  async stream(bucket: string, objectKey: string): Promise<StreamableFile> {
    if (!this.allowedBucket(bucket)) throw new NotFoundException();
    if (!objectKey || objectKey.includes('..') || objectKey.startsWith('/')) throw new NotFoundException();
    try {
      const stream = await this.minio.getObject(bucket, objectKey);
      const type = contentTypeForObjectKey(objectKey);
      return new StreamableFile(stream, { type, disposition: 'inline' });
    } catch {
      throw new NotFoundException();
    }
  }
}
