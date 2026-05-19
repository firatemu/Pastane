import { IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class UpdateCourierDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{10,15}$/)
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  /** When set, replaces the courier user's password (never returned in API responses). */
  @IsOptional()
  @IsString()
  @MinLength(8)
  newPassword?: string;

  @IsOptional()
  @IsString()
  vehicle?: string;
}
