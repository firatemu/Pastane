import { HttpStatus } from '@nestjs/common';
import { CourierStatus, UserStatus } from '@prisma/client';
import { CouriersService } from './couriers.service';
import { AppException } from '../common/exceptions/app.exception';

describe('CouriersService', () => {
  const audit = { log: jest.fn() };

  it('rejects includeRemoved list without management permission', async () => {
    const prisma = {} as never;
    const service = new CouriersService(prisma, audit as never);
    await expect(
      service.list({ includeRemoved: true }, { sub: 'o1', phone: '1', role: 'ORDER_OPERATOR', permissions: ['couriers.view'] }),
    ).rejects.toBeInstanceOf(AppException);
  });

  it('runs list with includeRemoved for admin-style permission', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const prisma = { $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)) } as never;
    Object.assign(prisma as object, {
      courier: { findMany, count },
    });
    const service = new CouriersService(prisma, audit as never);
    await service.list(
      { includeRemoved: true },
      { sub: 'a1', phone: '1', role: 'ADMIN', permissions: ['couriers.view', 'couriers.create'] },
    );
    const where = findMany.mock.calls[0]?.[0]?.where as Record<string, unknown>;
    expect(where.deletedAt).toBeUndefined();
  });

  it('create rejects duplicate phone', async () => {
    const findFirst = jest.fn().mockResolvedValue({ id: 'existing' });
    const prisma = { user: { findFirst }, role: { findUnique: jest.fn() } } as never;
    const service = new CouriersService(prisma, audit as never);
    await expect(
      service.create(
        {
          firstName: 'A',
          lastName: 'B',
          phone: '5551234567',
          password: 'password123',
        },
        { sub: 'a1', phone: '1', role: 'ADMIN', permissions: ['couriers.create'] },
      ),
    ).rejects.toMatchObject({ status: HttpStatus.CONFLICT });
  });

  it('create provisions user and courier with COURIER role', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const userCreate = jest.fn().mockResolvedValue({ id: 'u-new' });
    const courierRole = { id: 'role-courier' };
    const createdCourier = {
      id: 'c-new',
      userId: 'u-new',
      vehicle: 'Bike',
      status: CourierStatus.ACTIVE,
      user: { id: 'u-new', firstName: 'A', lastName: 'B', phone: '5551234999', email: null, status: UserStatus.ACTIVE },
      _count: { deliveries: 0 },
    };
    const courierCreate = jest.fn().mockResolvedValue(createdCourier);
    const tx = {
      user: { create: userCreate },
      courier: { create: courierCreate },
    };
    const prisma = {
      user: { findFirst },
      role: { findUnique: jest.fn().mockResolvedValue(courierRole) },
      $transaction: jest.fn((fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
    } as never;
    const service = new CouriersService(prisma, audit as never);
    const result = await service.create(
      { firstName: 'A', lastName: 'B', phone: '5551234999', password: 'password12345', vehicle: 'Bike' },
      { sub: 'a1', phone: '1', role: 'ADMIN', permissions: ['couriers.create'] },
    );
    expect(userCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          roleId: courierRole.id,
          phone: '5551234999',
          status: UserStatus.ACTIVE,
          passwordHash: expect.any(String),
        }),
      }),
    );
    expect(courierCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'u-new', vehicle: 'Bike', status: CourierStatus.ACTIVE }),
      }),
    );
    expect(result.id).toBe('c-new');
    expect(audit.log).toHaveBeenCalled();
  });

  it('deactivate rejects when courier has active delivery', async () => {
    const courier = {
      id: 'c1',
      userId: 'u1',
      status: CourierStatus.ACTIVE,
      deletedAt: null,
      user: { id: 'u1' },
    };
    const findFirst = jest.fn().mockResolvedValue(courier);
    const count = jest.fn().mockResolvedValue(1);
    const prisma = {
      courier: { findFirst },
      delivery: { count },
    } as never;
    const service = new CouriersService(prisma, audit as never);
    await expect(service.deactivate('c1')).rejects.toMatchObject({ status: HttpStatus.CONFLICT });
  });

  it('getById returns 404 for soft-deleted courier when viewer lacks management permission', async () => {
    const findFirst = jest.fn().mockResolvedValue({
      id: 'c1',
      deletedAt: new Date(),
      user: { id: 'u1', firstName: 'X', lastName: 'Y', phone: '1', email: null, status: UserStatus.INACTIVE },
      _count: { deliveries: 1 },
    });
    const prisma = { courier: { findFirst } } as never;
    const service = new CouriersService(prisma, audit as never);
    await expect(
      service.getById('c1', { sub: 'o1', phone: '1', role: 'ORDER_OPERATOR', permissions: ['couriers.view'] }),
    ).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });
  });

  it('assignable list keeps deletedAt null filter by default', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const prisma = {
      $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
      courier: { findMany, count },
    } as never;
    const service = new CouriersService(prisma, audit as never);
    await service.list(
      { status: CourierStatus.ACTIVE },
      { sub: 'o1', phone: '1', role: 'ORDER_OPERATOR', permissions: ['couriers.view'] },
    );
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ deletedAt: null, status: CourierStatus.ACTIVE }) }),
    );
  });
});
