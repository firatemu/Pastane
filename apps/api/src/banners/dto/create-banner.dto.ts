import { BannerMediaType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateBannerDto {
  @IsString() title!: string;
  @IsOptional() @IsString() subtitle?: string;
  @IsOptional() @IsString() description?: string;
  @IsEnum(BannerMediaType) mediaType!: BannerMediaType;
  @IsString() desktopMediaUrl!: string;
  @IsOptional() @IsString() desktopMediaBucket?: string | null;
  @IsOptional() @IsString() desktopMediaObjectKey?: string | null;
  @IsString() mobileMediaUrl!: string;
  @IsOptional() @IsString() mobileMediaBucket?: string | null;
  @IsOptional() @IsString() mobileMediaObjectKey?: string | null;
  @IsOptional() @IsString() buttonText?: string;
  @IsOptional() @IsString() buttonUrl?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsDateString() startsAt?: string;
  @IsOptional() @IsDateString() endsAt?: string;
}
