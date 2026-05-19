import { IsString, Matches } from 'class-validator';
export class VerifyOtpDto { @IsString() @Matches(/^\d{10,15}$/) phone!: string; @IsString() @Matches(/^\d{6}$/) code!: string; }
export class ResendOtpDto { @IsString() @Matches(/^\d{10,15}$/) phone!: string; }
