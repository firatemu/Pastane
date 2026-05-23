import { ProductUnitKind } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Matches, Min, MinLength } from 'class-validator';

export class CreateProductUnitDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  @Matches(/^[a-z0-9]+$/i, { message: 'Symbol must be alphanumeric' })
  symbol!: string;

  @IsOptional()
  @IsEnum(ProductUnitKind)
  kind?: ProductUnitKind;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
