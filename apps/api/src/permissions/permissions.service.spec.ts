import { RoleType } from '@prisma/client';
import { AppException } from '../common/exceptions/app.exception';
import { PermissionsService } from './permissions.service';

describe('PermissionsService', () => {
  const adminUser = {
    sub: 'user-admin-1',
    phone: '905550000001',
    role: RoleType.ADMIN,
    permissions: ['permissions.manage'],
  };

  it('blocks updating ADMIN role permissions', async () => {
    const prisma = {
      role: {
        findFirst: jest.fn().mockResolvedValue({ id: 'role-admin', name: RoleType.ADMIN }),
      },
    } as never;

    const service = new PermissionsService(prisma);

    await expect(service.updateRolePermissions(RoleType.ADMIN, [], adminUser)).rejects.toBeInstanceOf(
      AppException,
    );
  });

  it('blocks updating the current user role permissions', async () => {
    const prisma = {
      role: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'role-operator',
          name: RoleType.ORDER_OPERATOR,
        }),
      },
    } as never;

    const service = new PermissionsService(prisma);

    await expect(
      service.updateRolePermissions(RoleType.ORDER_OPERATOR, [], {
        ...adminUser,
        role: RoleType.ORDER_OPERATOR,
      }),
    ).rejects.toBeInstanceOf(AppException);
  });

  it('replaces the selected role permission set', async () => {
    const tx = {
      rolePermission: {
        deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      role: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'role-operator',
          name: RoleType.ORDER_OPERATOR,
          permissions: [],
        }),
      },
    };

    const prisma = {
      role: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'role-operator',
          name: RoleType.ORDER_OPERATOR,
        }),
      },
      permission: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 'perm-orders-view' }, { id: 'perm-orders-update' }]),
      },
      $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    } as never;

    const service = new PermissionsService(prisma);

    await service.updateRolePermissions(
      RoleType.ORDER_OPERATOR,
      ['perm-orders-update', 'perm-orders-view'],
      adminUser,
    );

    expect(tx.rolePermission.deleteMany).toHaveBeenCalledWith({
      where: {
        roleId: 'role-operator',
        permissionId: { notIn: ['perm-orders-update', 'perm-orders-view'] },
      },
    });
    expect(tx.rolePermission.createMany).toHaveBeenCalledWith({
      data: [
        { roleId: 'role-operator', permissionId: 'perm-orders-update' },
        { roleId: 'role-operator', permissionId: 'perm-orders-view' },
      ],
      skipDuplicates: true,
    });
    expect(tx.role.findUnique).toHaveBeenCalledWith({
      where: { id: 'role-operator' },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  });
});
