import { Type } from 'class-transformer';
import { DeliveryStatus } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
export class QueryMyDeliveriesDto {
  @IsOptional() @IsEnum(DeliveryStatus) status?: DeliveryStatus;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}
