import { IsString, Matches, MinLength } from 'class-validator';
export class LoginDto {
  @IsString()
  @Matches(/^\d{10,15}$/)
  phone!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
