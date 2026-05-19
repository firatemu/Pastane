import { BannerMediaType } from '@prisma/client';
import { IsEnum, IsIn, IsOptional } from 'class-validator';

export class UploadBannerMediaBodyDto {
  @IsIn(['desktop', 'mobile']) variant!: 'desktop' | 'mobile';
  @IsOptional() @IsEnum(BannerMediaType) expectKind?: BannerMediaType;
}
