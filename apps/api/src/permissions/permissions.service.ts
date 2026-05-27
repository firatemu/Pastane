import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { RoleType } from '@prisma/client';
import { ERROR_CODES } from '../common/constants/error-codes';
import type { AuthUser } from '../common/types/auth-user.type';
import { AppException } from '../common/exceptions/app.exception';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class PermissionsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.permission.findMany({
      where: { deletedAt: null },
      orderBy: { code: 'asc' },
    });
  }

  async management() {
    const [permissions, roles] = await Promise.all([
      this.prisma.permission.findMany({
        where: { deletedAt: null },
        orderBy: { code: 'asc' },
        select: {
          id: true,
          code: true,
          description: true,
        },
      }),
      this.prisma.role.findMany({
        where: { deletedAt: null },
        include: {
          permissions: {
            select: {
              permissionId: true,
            },
          },
        },
      }),
    ]);

    return {
      permissions,
      roles: roles.map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description,
        editable: role.name !== RoleType.ADMIN,
        permissionIds: role.permissions.map((permission) => permission.permissionId),
      })),
    };
  }

  async updateRolePermissions(roleName: RoleType, permissionIds: string[], user: AuthUser) {
    const requestedPermissionIds = [...new Set(permissionIds)];

    const role = await this.prisma.role.findFirst({
      where: { name: roleName, deletedAt: null },
      select: { id: true, name: true },
    });

    if (!role) {
      throw new AppException(ERROR_CODES.ROLE_NOT_FOUND, 'Rol bulunamadı.', HttpStatus.NOT_FOUND);
    }

    if (role.name === RoleType.ADMIN) {
      throw new AppException(
        ERROR_CODES.FORBIDDEN,
        'Sistem Yöneticisi rolünün izinleri panelden değiştirilemez.',
        HttpStatus.FORBIDDEN,
      );
    }

    if (user.role === role.name) {
      throw new AppException(
        ERROR_CODES.FORBIDDEN,
        'Kendi rolünüzün izinlerini bu panelden değiştiremezsiniz.',
        HttpStatus.FORBIDDEN,
      );
    }

    const validPermissions = await this.prisma.permission.findMany({
      where: {
        id: { in: requestedPermissionIds },
        deletedAt: null,
      },
      select: { id: true },
    });

    if (validPermissions.length !== requestedPermissionIds.length) {
      throw new AppException(
        ERROR_CODES.PERMISSION_NOT_FOUND,
        'Gönderilen izinlerden biri veya birkaçı bulunamadı.',
        HttpStatus.NOT_FOUND,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({
        where: requestedPermissionIds.length
          ? {
              roleId: role.id,
              permissionId: { notIn: requestedPermissionIds },
            }
          : {
              roleId: role.id,
            },
      });

      if (requestedPermissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: requestedPermissionIds.map((permissionId) => ({
            roleId: role.id,
            permissionId,
          })),
          skipDuplicates: true,
        });
      }

      return tx.role.findUnique({
        where: { id: role.id },
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      });
    });
  }
}
