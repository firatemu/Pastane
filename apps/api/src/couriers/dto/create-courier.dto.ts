import { CourierStatus } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateCourierDto {
  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsString()
  @Matches(/^\d{10,15}$/)
  phone!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  vehicle?: string;

  @IsOptional()
  @IsEnum(CourierStatus)
  status?: CourierStatus;
}
