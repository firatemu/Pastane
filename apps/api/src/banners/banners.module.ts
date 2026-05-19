import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { MediaModule } from '../media/media.module';
import { BannersController } from './banners.controller';
import { BannersService } from './banners.service';

@Module({
  imports: [AuditModule, MediaModule],
  controllers: [BannersController],
  providers: [BannersService],
})
export class BannersModule {}
