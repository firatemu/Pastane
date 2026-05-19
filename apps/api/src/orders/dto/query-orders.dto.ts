import { DeliveryType, OrderStatus, PaymentStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsEnum, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryOrdersDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsEnum(OrderStatus) status?: OrderStatus;
  @IsOptional() @IsEnum(DeliveryType) deliveryType?: DeliveryType;
  @IsOptional() @IsEnum(PaymentStatus) paymentStatus?: PaymentStatus;
  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return value;
  })
  @IsBoolean()
  assigned?: boolean;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsIn(['createdAt', 'scheduledAt', 'orderNumber', 'grandTotal']) sortBy?: 'createdAt' | 'scheduledAt' | 'orderNumber' | 'grandTotal';
  @IsOptional() @IsIn(['asc', 'desc']) sortOrder?: 'asc' | 'desc';
}
