import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { UserStatus } from '@prisma/client';
export class UpdateUserDto {
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsEnum(UserStatus) status?: UserStatus;
}
