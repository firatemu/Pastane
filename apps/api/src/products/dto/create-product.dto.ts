import { ProductStatus } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID, Matches, Min } from 'class-validator';

const hhmmPattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateProductDto {
  @IsString() name!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() shortDescription?: string;
  @IsNumber() @Min(0.01) price!: number;
  @IsOptional() @IsNumber() @Min(0.01) discountedPrice?: number;
  @IsUUID() categoryId!: string;
  @IsOptional() @IsEnum(ProductStatus) status?: ProductStatus;
  @IsOptional() @IsInt() @Min(1) preparationMinutes?: number;
  @IsOptional() @IsBoolean() isPublished?: boolean;
  @IsOptional() @IsString() @Matches(hhmmPattern) saleWindowStart?: string;
  @IsOptional() @IsString() @Matches(hhmmPattern) saleWindowEnd?: string;
  @IsOptional() @IsArray() @IsUUID('4', { each: true }) allergenIds?: string[];
}
