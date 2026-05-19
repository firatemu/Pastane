import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { PublicFilesController } from './public-files.controller';
import { PublicFilesService } from './public-files.service';
import { minioProvider } from './providers/minio.provider';

@Module({
  controllers: [MediaController, PublicFilesController],
  providers: [MediaService, PublicFilesService, minioProvider],
  exports: [MediaService, minioProvider],
})
export class MediaModule {}
