import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { compare, hash } from 'bcryptjs';
import { PrismaService } from '../database/prisma.service';
import { AppException } from '../common/exceptions/app.exception';
import { ERROR_CODES } from '../common/constants/error-codes';
import type { ChangePasswordDto } from './dto/change-password.dto';
import type { UpdateOwnProfileDto } from './dto/update-own-profile.dto';
import type { UpdateUserDto } from './dto/update-user.dto';
@Injectable()
export class UsersService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}
  list() {
    return this.prisma.user.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        status: true,
        role: { select: { name: true } },
        isPhoneVerified: true,
      },
    });
  }
  async getById(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        status: true,
        role: { select: { name: true } },
        isPhoneVerified: true,
      },
    });
    if (!user)
      throw new AppException(ERROR_CODES.USER_NOT_FOUND, 'User not found', HttpStatus.NOT_FOUND);
    return user;
  }
  async update(id: string, dto: UpdateUserDto) {
    await this.getById(id);
    const { roleName, ...userData } = dto;
    const data = { ...userData, ...(roleName ? { role: { connect: { name: roleName } } } : {}) };
    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        status: true,
        isPhoneVerified: true,
        role: { select: { name: true } },
      },
    });
  }
  async updateOwn(id: string, dto: UpdateOwnProfileDto) {
    await this.getById(id);
    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        status: true,
        isPhoneVerified: true,
        role: { select: { name: true } },
      },
    });
  }
  async changeOwnPassword(id: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!user)
      throw new AppException(ERROR_CODES.USER_NOT_FOUND, 'User not found', HttpStatus.NOT_FOUND);
    if (!(await compare(dto.currentPassword, user.passwordHash)))
      throw new AppException(
        ERROR_CODES.AUTH_INVALID_CREDENTIALS,
        'Current password is invalid',
        HttpStatus.UNAUTHORIZED,
      );
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash: await hash(dto.newPassword, 12) },
    });
    return { changed: true };
  }
}
