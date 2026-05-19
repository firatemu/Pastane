import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { RoleType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AppException } from '../common/exceptions/app.exception';
import { ERROR_CODES } from '../common/constants/error-codes';
@Injectable()
export class RolesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}
  list() { return this.prisma.role.findMany({ where: { deletedAt: null }, include: { permissions: { include: { permission: true } } } }); }
  async getByName(name: RoleType) { const role = await this.prisma.role.findUnique({ where: { name }, include: { permissions: { include: { permission: true } } } }); if (!role) throw new AppException(ERROR_CODES.ROLE_NOT_FOUND, 'Role not found', HttpStatus.NOT_FOUND); return role; }
}
