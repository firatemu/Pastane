import { IsOptional, IsString } from 'class-validator';

export class UploadMediaAssetDto {
  @IsOptional()
  @IsString()
  folder?: string;

  @IsOptional()
  @IsString()
  title?: string;
}
