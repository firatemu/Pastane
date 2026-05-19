import { Allow, IsBoolean, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateSettingDto {
  @Allow() value!: unknown;
}

export class UpdateSystemSettingsDto {
  @IsOptional() @IsBoolean() otpActive?: boolean;
  @IsOptional() @IsBoolean() deliveryActive?: boolean;
  @IsOptional() @IsBoolean() pickupActive?: boolean;
  @IsOptional() @IsBoolean() loyaltyActive?: boolean;
  @IsOptional() @IsBoolean() paymentActive?: boolean;
  @IsOptional() @IsNumber() @Min(0) minimumOrderValue?: number;
}
