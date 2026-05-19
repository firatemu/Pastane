import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class ScanLoyaltyDto { @IsString() qrCode!: string; }
export class RedeemLoyaltyDto { @IsInt() @Min(1) points!: number; @IsOptional() @IsUUID() userId?: string; @IsOptional() @IsString() qrCode?: string; @IsOptional() @IsString() note?: string; }
export class AdjustLoyaltyDto extends RedeemLoyaltyDto {}
export class UpdateLoyaltySettingDto { @IsOptional() @IsNumber() @Min(0) earnRate?: number; @IsOptional() @IsNumber() @Min(0) pointValue?: number; @IsOptional() @IsInt() @Min(0) minimumRedeem?: number; @IsOptional() @IsBoolean() isActive?: boolean; }
