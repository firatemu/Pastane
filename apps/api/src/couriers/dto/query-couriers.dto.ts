import { CourierStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryCouriersDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsEnum(CourierStatus) status?: CourierStatus;

  /** When true, includes soft-removed couriers (`deletedAt` set). Requires `couriers.create` or `couriers.update`. */
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  includeRemoved?: boolean;
}

