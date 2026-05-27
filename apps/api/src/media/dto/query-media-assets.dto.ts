import { MediaAssetKind, MediaAssetSource } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export enum MediaUsageStatus {
  ALL = 'ALL',
  USED = 'USED',
  UNUSED = 'UNUSED',
}

export class QueryMediaAssetsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(MediaAssetKind)
  kind?: MediaAssetKind;

  @IsOptional()
  @IsEnum(MediaAssetSource)
  source?: MediaAssetSource;

  @IsOptional()
  @IsEnum(MediaUsageStatus)
  usageStatus?: MediaUsageStatus;
}
