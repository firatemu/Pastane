import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { Client as MinioClient } from 'minio';
import { PrismaService } from '../database/prisma.service';
@Injectable()
export class HealthService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService, @Inject(ConfigService) private readonly config: ConfigService) {}
  async getStatus() {
    const [postgres, redis, minio] = await Promise.all([this.checkPostgres(), this.checkRedis(), this.checkMinio()]);
    return { status: postgres && redis && minio ? 'ok' : 'degraded', services: { postgres, redis, minio } };
  }
  private async checkPostgres(): Promise<boolean> { try { await this.prisma.$queryRaw`SELECT 1`; return true; } catch { return false; } }
  private async checkRedis(): Promise<boolean> { const redis = new Redis({ host: this.config.get('REDIS_HOST', 'localhost'), port: Number(this.config.get('REDIS_PORT', 6379)), password: this.config.get('REDIS_PASSWORD') }); try { return await redis.ping() === 'PONG'; } catch { return false; } finally { redis.disconnect(); } }
  private async checkMinio(): Promise<boolean> { const client = new MinioClient({ endPoint: this.config.get('MINIO_ENDPOINT', 'localhost'), port: Number(this.config.get('MINIO_PORT', 9000)), useSSL: this.config.get('MINIO_USE_SSL', 'false') === 'true', accessKey: this.config.getOrThrow('MINIO_ACCESS_KEY'), secretKey: this.config.getOrThrow('MINIO_SECRET_KEY') }); try { await client.listBuckets(); return true; } catch { return false; } }
}
