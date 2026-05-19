import { Controller, Get, Inject, NotFoundException, Param } from '@nestjs/common';
import type { StreamableFile } from '@nestjs/common';
import { SkipResponseEnvelope } from '../common/decorators/skip-response-envelope.decorator';
import { Public } from '../common/decorators/public.decorator';
import { PublicFilesService } from './public-files.service';

@SkipResponseEnvelope()
@Public()
@Controller('files')
export class PublicFilesController {
  constructor(@Inject(PublicFilesService) private readonly files: PublicFilesService) {}

  @Get(':bucket/:encodedKey')
  async stream(@Param('bucket') bucket: string, @Param('encodedKey') encodedKey: string): Promise<StreamableFile> {
    let objectKey: string;
    try {
      objectKey = decodeURIComponent(encodedKey);
    } catch {
      throw new NotFoundException();
    }
    return this.files.stream(bucket, objectKey);
  }
}
