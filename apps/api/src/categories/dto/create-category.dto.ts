import { IsBoolean, IsInt, IsOptional, IsString, IsUrl, IsUUID, Min } from 'class-validator';
export class CreateCategoryDto { @IsString() name!: string; @IsOptional() @IsString() description?: string; @IsOptional() @IsUrl() imageUrl?: string; @IsOptional() @IsUUID() parentId?: string; @IsOptional() @IsInt() @Min(0) sortOrder?: number; @IsOptional() @IsBoolean() isActive?: boolean; }
