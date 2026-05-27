import { RoleType, UserStatus } from '@prisma/client';
import { hash } from 'bcryptjs';
import type { JwtService } from '@nestjs/jwt';
import type { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AppException } from '../common/exceptions/app.exception';

describe('AuthService courier login', () => {
  it('accepts active courier user credentials', async () => {
    const passwordHash = await hash('password12345', 12);
    const findUnique = jest.fn().mockResolvedValue({
      id: 'user-courier-1',
      phone: '905551234567',
      deletedAt: null,
      status: UserStatus.ACTIVE,
      passwordHash,
    });
    const createSessionUser = {
      id: 'user-courier-1',
      firstName: 'Kurye',
      lastName: 'Bir',
      phone: '905551234567',
      email: null,
      isPhoneVerified: true,
      status: UserStatus.ACTIVE,
      deletedAt: null,
      role: { name: RoleType.COURIER, permissions: [{ permission: { code: 'deliveries.viewOwn' } }] },
    };
    const prisma = {
      user: {
        findUnique,
        findFirst: jest.fn().mockResolvedValue(createSessionUser),
      },
      refreshToken: { create: jest.fn().mockResolvedValue({ id: 'rt1' }) },
    } as never;
    const jwt = { signAsync: jest.fn().mockResolvedValue('token') } as unknown as JwtService;
    const config = { getOrThrow: jest.fn().mockReturnValue('secret'), get: jest.fn().mockReturnValue('30d') } as unknown as ConfigService;
    const service = new AuthService(prisma, jwt, config);
    const result = await service.login({ phone: '5551234567', password: 'password12345' });
    expect(findUnique).toHaveBeenCalledWith({ where: { phone: '905551234567' } });
    expect(result.accessToken).toBe('token');
    expect(result.user.role).toBe(RoleType.COURIER);
  });

  it('rejects inactive courier user', async () => {
    const passwordHash = await hash('password12345', 12);
    const findUnique = jest.fn().mockResolvedValue({
      id: 'user-courier-2',
      phone: '905559990000',
      deletedAt: null,
      status: UserStatus.INACTIVE,
      passwordHash,
    });
    const prisma = { user: { findUnique } } as never;
    const service = new AuthService(prisma, {} as JwtService, {} as ConfigService);
    await expect(service.login({ phone: '5559990000', password: 'password12345' })).rejects.toBeInstanceOf(AppException);
  });

  it('rejects refresh when session user was soft deleted', async () => {
    const prisma = {
      refreshToken: {
        findMany: jest.fn().mockResolvedValue([{ id: 'rt-1', tokenHash: await hash('refresh-token', 12) }]),
        update: jest.fn().mockResolvedValue({ id: 'rt-1' }),
      },
      user: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    } as never;
    const jwt = {
      verifyAsync: jest.fn().mockResolvedValue({ sub: 'deleted-user-1' }),
    } as unknown as JwtService;
    const config = {
      getOrThrow: jest.fn().mockReturnValue('secret'),
      get: jest.fn().mockReturnValue('30d'),
    } as unknown as ConfigService;

    const service = new AuthService(prisma, jwt, config);

    await expect(service.refresh('refresh-token')).rejects.toBeInstanceOf(AppException);
  });
});
