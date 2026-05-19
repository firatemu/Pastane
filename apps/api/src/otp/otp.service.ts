import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { AppException } from '../common/exceptions/app.exception';
import { ERROR_CODES } from '../common/constants/error-codes';

@Injectable()
export class OtpService {
  constructor(@Inject(ConfigService) private readonly config: ConfigService, @Inject(PrismaService) private readonly prisma: PrismaService) {}
  isEnabled(): boolean { return this.config.get<string>('OTP_ACTIVE', 'false') === 'true'; }
  async assertDisabledByDefault(): Promise<void> {
    if (!this.isEnabled()) throw new AppException(ERROR_CODES.AUTH_OTP_DISABLED, 'OTP infrastructure is disabled', HttpStatus.NOT_IMPLEMENTED);
  }
  async verify(phone: string, code: string): Promise<void> {
    await this.assertDisabledByDefault();
    const otp = await this.prisma.otpCode.findFirst({ where: { phone, codeHash: code, usedAt: null }, orderBy: { createdAt: 'desc' } });
    if (!otp || otp.expiresAt < new Date()) throw new AppException(ERROR_CODES.AUTH_OTP_INVALID, 'OTP is invalid or expired', HttpStatus.BAD_REQUEST);
  }
}
