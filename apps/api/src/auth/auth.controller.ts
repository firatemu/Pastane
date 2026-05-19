import { Body, Controller, Inject, Post } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { RateLimit } from '../common/decorators/rate-limit.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}
  @Public() @RateLimit({ points: 5, durationSeconds: 60 }) @ApiBody({ type: RegisterDto }) @Post('register') register(@Body() dto: RegisterDto) { return this.auth.register(dto); }
  @Public() @RateLimit({ points: 10, durationSeconds: 60 }) @ApiBody({ type: LoginDto }) @Post('login') login(@Body() dto: LoginDto) { return this.auth.login(dto); }
  @Public() @RateLimit({ points: 20, durationSeconds: 60 }) @ApiBody({ type: RefreshTokenDto }) @Post('refresh') refresh(@Body() dto: RefreshTokenDto) { return this.auth.refresh(dto.refreshToken); }
  @ApiBody({ type: RefreshTokenDto }) @Post('logout') logout(@Body() dto: RefreshTokenDto) { return this.auth.logout(dto.refreshToken); }
}
