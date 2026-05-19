import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RoleType, UserStatus } from '@prisma/client';
import { compare, hash } from 'bcryptjs';
import { randomUUID } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { AppException } from '../common/exceptions/app.exception';
import { ERROR_CODES } from '../common/constants/error-codes';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type { AuthUser } from '../common/types/auth-user.type';
import { normalizeTrMobilePhoneDigits } from '../common/utils/tr-phone.util';

@Injectable()
export class AuthService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService, @Inject(JwtService) private readonly jwt: JwtService, @Inject(ConfigService) private readonly config: ConfigService) {}

  async register(dto: RegisterDto) {
    const phone = normalizeTrMobilePhoneDigits(dto.phone);
    const existing = await this.prisma.user.findFirst({ where: { OR: [{ phone }, ...(dto.email ? [{ email: dto.email }] : [])] } });
    if (existing) throw new AppException(ERROR_CODES.USER_ALREADY_EXISTS, 'User already exists', HttpStatus.CONFLICT);
    const customerRole = await this.prisma.role.findUniqueOrThrow({ where: { name: RoleType.CUSTOMER } });
    const { password, ...userData } = dto;
    const user = await this.prisma.user.create({ data: { ...userData, phone, passwordHash: await hash(password, 12), roleId: customerRole.id } });
    return this.createSession(user.id);
  }

  async login(dto: LoginDto) {
    const phone = normalizeTrMobilePhoneDigits(dto.phone);
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user || user.deletedAt || user.status !== UserStatus.ACTIVE || !(await compare(dto.password, user.passwordHash))) {
      throw new AppException(ERROR_CODES.AUTH_INVALID_CREDENTIALS, 'Invalid credentials', HttpStatus.UNAUTHORIZED);
    }
    return this.createSession(user.id);
  }

  async refresh(rawToken: string) {
    const payload = await this.verifyRefreshToken(rawToken);
    const tokenHash = await hash(rawToken, 12);
    const sessions = await this.prisma.refreshToken.findMany({ where: { userId: payload.sub, revokedAt: null, expiresAt: { gt: new Date() } } });
    const session = await this.findMatchingSession(rawToken, sessions);
    if (!session) throw new AppException(ERROR_CODES.AUTH_REFRESH_TOKEN_INVALID, 'Refresh token is invalid', HttpStatus.UNAUTHORIZED);
    await this.prisma.refreshToken.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
    void tokenHash;
    return this.createSession(payload.sub);
  }

  async logout(rawToken: string): Promise<{ loggedOut: true }> {
    const sessions = await this.prisma.refreshToken.findMany({ where: { revokedAt: null, expiresAt: { gt: new Date() } } });
    const session = await this.findMatchingSession(rawToken, sessions);
    if (session) await this.prisma.refreshToken.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
    return { loggedOut: true };
  }

  private async createSession(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });
    const authUser: AuthUser = { sub: user.id, phone: user.phone, role: user.role.name, permissions: user.role.permissions.map((item) => item.permission.code) };
    const accessToken = await this.jwt.signAsync(authUser, { secret: this.config.getOrThrow('JWT_SECRET'), expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN', '15m') });
    const refreshToken = await this.jwt.signAsync({ sub: user.id, jti: randomUUID() }, { secret: this.config.getOrThrow('JWT_REFRESH_SECRET'), expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '30d') });
    const expiresAt = new Date(Date.now() + this.parseDurationMs(this.config.get('JWT_REFRESH_EXPIRES_IN', '30d')));
    await this.prisma.refreshToken.create({ data: { userId: user.id, tokenHash: await hash(refreshToken, 12), expiresAt } });
    return { accessToken, refreshToken, user: { id: user.id, firstName: user.firstName, lastName: user.lastName, phone: user.phone, email: user.email, role: user.role.name, isPhoneVerified: user.isPhoneVerified } };
  }

  private async verifyRefreshToken(token: string): Promise<{ sub: string }> {
    try { return await this.jwt.verifyAsync<{ sub: string }>(token, { secret: this.config.getOrThrow('JWT_REFRESH_SECRET') }); }
    catch { throw new AppException(ERROR_CODES.AUTH_REFRESH_TOKEN_INVALID, 'Refresh token is invalid', HttpStatus.UNAUTHORIZED); }
  }

  private async findMatchingSession(token: string, sessions: Array<{ id: string; tokenHash: string }>) {
    for (const session of sessions) if (await compare(token, session.tokenHash)) return session;
    return null;
  }

  private parseDurationMs(value: string): number {
    const match = /^(\d+)([smhd])$/.exec(value);
    if (!match) return 30 * 24 * 60 * 60 * 1000;
    const factors = { s: 1000, m: 60000, h: 3600000, d: 86400000 } as const;
    return Number(match[1]) * factors[match[2] as keyof typeof factors];
  }
}
