import { DeliveryStatus, Prisma, RoleType, UserStatus } from '@prisma/client';
import { AppException } from '../common/exceptions/app.exception';
import type { AuthUser } from '../common/types/auth-user.type';
import { UserListScope } from './dto/query-users.dto';
import { UsersService } from './users.service';

function createAuthUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    sub: 'actor-1',
    phone: '905551111111',
    role: RoleType.ADMIN,
    permissions: ['users.view', 'users.update', 'users.delete', 'customers.view'],
    ...overrides,
  };
}

function createService() {
  const prisma = {
    user: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    order: {
      count: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    },
    notification: {
      count: jest.fn(),
    },
    delivery: {
      count: jest.fn(),
    },
    refreshToken: {
      updateMany: jest.fn(),
    },
    courier: {
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation(async (arg: unknown): Promise<unknown> => {
    if (typeof arg === 'function') {
      return arg(prisma);
    }
    return Promise.all(arg as Promise<unknown>[]);
  });

  const audit = {
    log: jest.fn(),
  };

  return {
    prisma,
    audit,
    service: new UsersService(prisma as never, audit as never),
  };
}

describe('UsersService', () => {
  it('lists only non-customer staff accounts in staff scope', async () => {
    const { prisma, service } = createService();
    prisma.user.findMany.mockResolvedValue([]);

    await service.list({ scope: UserListScope.STAFF });

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          role: { name: { in: [RoleType.ADMIN, RoleType.ORDER_OPERATOR, RoleType.PRODUCT_MANAGER, RoleType.COURIER] } },
        }),
      }),
    );
  });

  it('builds customer 360 details with summary values', async () => {
    const { prisma, service } = createService();
    prisma.user.findFirst.mockResolvedValue({
      id: 'customer-1',
      firstName: 'Demo',
      lastName: 'Müşteri',
      phone: '905551234567',
      email: 'demo@pastane.com',
      status: UserStatus.ACTIVE,
      isPhoneVerified: true,
      createdAt: new Date('2026-01-01T10:00:00.000Z'),
      updatedAt: new Date('2026-01-05T10:00:00.000Z'),
      addresses: [
        {
          id: 'addr-1',
          title: 'Ev',
          city: 'Mersin',
          district: 'Yenişehir',
          neighborhood: 'Limonluk',
          fullAddress: 'Örnek Sokak No:1',
          building: null,
          floor: null,
          apartment: null,
          directions: null,
          isDefault: true,
          createdAt: new Date('2026-01-01T10:00:00.000Z'),
          updatedAt: new Date('2026-01-01T10:00:00.000Z'),
        },
      ],
      loyaltyAccount: {
        id: 'loy-1',
        points: 45,
        qrCode: 'LOY-CUSTOMER',
        createdAt: new Date('2026-01-01T10:00:00.000Z'),
        updatedAt: new Date('2026-01-02T10:00:00.000Z'),
        movements: [
          {
            id: 'mov-1',
            type: 'ADJUSTMENT',
            points: 10,
            balanceAfter: 45,
            note: 'Manuel düzeltme',
            createdAt: new Date('2026-01-05T10:00:00.000Z'),
          },
        ],
      },
      notifications: [
        {
          id: 'ntf-1',
          type: 'IN_APP',
          title: 'Hoş geldiniz',
          body: 'Deneme',
          metadata: null,
          readAt: null,
          createdAt: new Date('2026-01-05T10:00:00.000Z'),
        },
      ],
      reviews: [
        {
          id: 'rev-1',
          rating: 5,
          comment: 'Harika',
          status: 'APPROVED',
          rejectedReason: null,
          createdAt: new Date('2026-01-03T10:00:00.000Z'),
          product: { id: 'prod-1', name: 'Poğaça' },
          orderItem: { orderId: 'order-1', productNameSnapshot: 'Poğaça' },
        },
      ],
      orders: [
        {
          id: 'order-1',
          orderNumber: 'ORD-1',
          createdAt: new Date('2026-01-06T10:00:00.000Z'),
          scheduledAt: null,
          deliveryType: 'HOME_DELIVERY',
          status: 'DELIVERED',
          grandTotal: new Prisma.Decimal('120.50'),
          note: null,
          _count: { items: 2 },
          payments: [
            {
              id: 'pay-1',
              status: 'SUCCESS',
              amount: new Prisma.Decimal('120.50'),
              providerStatus: 'success',
              createdAt: new Date('2026-01-06T10:05:00.000Z'),
            },
          ],
          delivery: {
            status: DeliveryStatus.OUT_FOR_DELIVERY,
            courier: {
              user: {
                firstName: 'Kurye',
                lastName: 'Bir',
              },
            },
          },
        },
      ],
    });
    prisma.order.count.mockResolvedValueOnce(4).mockResolvedValueOnce(2);
    prisma.order.aggregate.mockResolvedValue({
      _sum: { grandTotal: new Prisma.Decimal('120.50') },
    });
    prisma.notification.count.mockResolvedValue(1);

    const detail = await service.getCustomerDetail('customer-1');

    expect(detail.summary.totalOrders).toBe(4);
    expect(detail.summary.deliveredOrders).toBe(2);
    expect(detail.summary.lifetimeSpent).toBe('120.5');
    expect(detail.recentOrders[0].grandTotal).toBe('120.5');
    expect(detail.recentOrders[0].payments[0].amount).toBe('120.5');
  });

  it('prevents deleting own account', async () => {
    const { prisma, service } = createService();
    prisma.user.findFirst.mockResolvedValue({
      id: 'actor-1',
      firstName: 'Sistem',
      lastName: 'Admin',
      phone: '905551111111',
      email: 'admin@pastane.com',
      status: UserStatus.ACTIVE,
      isPhoneVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      role: { name: RoleType.ADMIN },
      courier: null,
    });

    await expect(service.delete('actor-1', createAuthUser())).rejects.toBeInstanceOf(AppException);
  });

  it('prevents deleting customer accounts', async () => {
    const { prisma, service } = createService();
    prisma.user.findFirst.mockResolvedValue({
      id: 'customer-1',
      firstName: 'Demo',
      lastName: 'Müşteri',
      phone: '905551234567',
      email: 'demo@pastane.com',
      status: UserStatus.ACTIVE,
      isPhoneVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      role: { name: RoleType.CUSTOMER },
      courier: null,
    });

    await expect(service.deleteCustomer('customer-1', createAuthUser({ sub: 'actor-2' }))).rejects.toBeInstanceOf(
      AppException,
    );
    expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('prevents deleting the last active administrator', async () => {
    const { prisma, service } = createService();
    prisma.user.findFirst.mockResolvedValue({
      id: 'admin-1',
      firstName: 'Sistem',
      lastName: 'Admin',
      phone: '905551111111',
      email: 'admin@pastane.com',
      status: UserStatus.ACTIVE,
      isPhoneVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      role: { name: RoleType.ADMIN },
      courier: null,
    });
    prisma.user.count.mockResolvedValue(1);

    await expect(service.delete('admin-1', createAuthUser({ sub: 'actor-2' }))).rejects.toBeInstanceOf(
      AppException,
    );
  });

  it('prevents deleting couriers with active deliveries', async () => {
    const { prisma, service } = createService();
    prisma.user.findFirst.mockResolvedValue({
      id: 'courier-user-1',
      firstName: 'Kurye',
      lastName: 'Bir',
      phone: '905551222222',
      email: 'courier@pastane.com',
      status: UserStatus.ACTIVE,
      isPhoneVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      role: { name: RoleType.COURIER },
      courier: {
        id: 'courier-1',
        status: 'ACTIVE',
        deletedAt: null,
      },
    });
    prisma.delivery.count.mockResolvedValue(1);

    await expect(
      service.delete('courier-user-1', createAuthUser({ sub: 'actor-2' })),
    ).rejects.toBeInstanceOf(AppException);
  });
});
