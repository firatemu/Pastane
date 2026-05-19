import { CampaignStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateCampaignDto {
  @IsString() name!: string;
  @IsOptional() @IsString() description?: string;
  @IsString() type!: string;
  @IsNumber() @Min(0) value!: number;
  @IsEnum(CampaignStatus) status!: CampaignStatus;
  @IsDateString() startDate!: string;
  @IsOptional() @IsDateString() endDate?: string;
}
export class UpdateCampaignDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsNumber() @Min(0) value?: number;
  @IsOptional() @IsEnum(CampaignStatus) status?: CampaignStatus;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
}
