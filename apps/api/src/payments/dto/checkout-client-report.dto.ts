import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CheckoutClientReportDto {
  @IsString()
  @MaxLength(64)
  step!: string;

  @IsString()
  @MaxLength(500)
  message!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  code?: string;

  @IsOptional()
  @IsUUID()
  orderId?: string;
}
