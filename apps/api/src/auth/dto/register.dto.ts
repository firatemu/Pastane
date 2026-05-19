import { IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';
export class RegisterDto {
  @IsString() firstName!: string;
  @IsString() lastName!: string;
  @IsString() @Matches(/^\d{10,15}$/) phone!: string;
  @IsOptional() @IsEmail() email?: string;
  @IsString() @MinLength(8) password!: string;
}
