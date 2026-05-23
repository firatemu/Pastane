import { DeliveryStatus, DeliveryType, OrderStatus, ProductStatus } from '@prisma/client';
import { OrdersService } from './orders.service';
import { OrderStatusService } from './order-status.service';

describe('OrdersService admin operations', () => {
  const baseDeps = [
    { validateForCheckout: jest.fn() } as never,
    new OrderStatusService(),
    {} as never,
    { log: jest.fn() } as never,
    {} as never,
    { createOrderStatusNotification: jest.fn() } as never,
  ] as const;

  it('keeps customer order detail owner-scoped without viewAll permission', async () => {
    const findFirst = jest.fn().mockResolvedValue({ id: 'order-1' });
    const prisma = { order: { findFirst } } as never;
    const service = new OrdersService(prisma, ...baseDeps);
    await service.getForUser({ sub: 'customer-1', phone: '1', role: 'CUSTOMER', permissions: ['orders.viewOwn'] }, 'order-1');
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'order-1', deletedAt: null, userId: 'customer-1' } }));
  });

  it('allows admin-style order detail access without owner filter', async () => {
    const findFirst = jest.fn().mockResolvedValue({ id: 'order-1' });
    const prisma = { order: { findFirst } } as never;
    const service = new OrdersService(prisma, ...baseDeps);
    await service.getForUser({ sub: 'operator-1', phone: '1', role: 'ORDER_OPERATOR', permissions: ['orders.viewAll'] }, 'order-1');
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'order-1', deletedAt: null } }));
  });

  it('rejects assigning pickup orders transactionally', async () => {
    const tx = { order: { findFirst: jest.fn().mockResolvedValue({ id: 'order-1', deliveryType: DeliveryType.PICKUP, status: OrderStatus.READY }) } };
    const prisma = { $transaction: jest.fn((fn) => fn(tx)) } as never;
    const service = new OrdersService(prisma, ...baseDeps);
    await expect(service.assignCourier('order-1', { courierId: 'courier-1' })).rejects.toThrow('Pickup orders cannot be assigned');
  });

  it('reassigns courier when assigned order delivery is still ASSIGNED', async () => {
    const notifications = { createOrderStatusNotification: jest.fn() };
    const audit = { log: jest.fn() };
    const orderRow = {
      id: 'order-1',
      deletedAt: null,
      deliveryType: DeliveryType.HOME_DELIVERY,
      status: OrderStatus.ASSIGNED_TO_COURIER,
      userId: 'user-1',
      orderNumber: 'ON1',
      delivery: { courierId: 'old-courier', status: DeliveryStatus.ASSIGNED, orderId: 'order-1' },
    };
    const updatedDelivery = { id: 'delivery-1', courierId: 'new-courier' };
    const tx = {
      order: { findFirst: jest.fn().mockResolvedValue(orderRow), update: jest.fn() },
      courier: { findFirst: jest.fn().mockResolvedValue({ id: 'new-courier' }) },
      delivery: {
        upsert: jest.fn(),
        update: jest.fn().mockResolvedValue(updatedDelivery),
      },
      orderStatusHistory: { create: jest.fn() },
    };
    const prisma = { $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)) } as never;
    const service = new OrdersService(prisma, { validateForCheckout: jest.fn() } as never, new OrderStatusService(), {} as never, audit as never, {} as never, notifications as never);
    await expect(service.assignCourier('order-1', { courierId: 'new-courier' })).resolves.toEqual({ orderId: 'order-1', delivery: updatedDelivery });
    expect(tx.order.update).not.toHaveBeenCalled();
    expect(tx.orderStatusHistory.create).not.toHaveBeenCalled();
    expect(tx.delivery.upsert).not.toHaveBeenCalled();
    expect(notifications.createOrderStatusNotification).not.toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalled();
  });

  it('rejects courier reassignment once delivery has started', async () => {
    const notifications = { createOrderStatusNotification: jest.fn() };
    const audit = { log: jest.fn() };
    const orderRow = {
      id: 'order-1',
      deletedAt: null,
      deliveryType: DeliveryType.HOME_DELIVERY,
      status: OrderStatus.ASSIGNED_TO_COURIER,
      userId: 'user-1',
      orderNumber: 'ON1',
      delivery: { courierId: 'c1', status: DeliveryStatus.PICKED_UP, orderId: 'order-1' },
    };
    const tx = {
      order: { findFirst: jest.fn().mockResolvedValue(orderRow) },
      courier: { findFirst: jest.fn().mockResolvedValue({ id: 'c2' }) },
      delivery: { update: jest.fn(), upsert: jest.fn() },
      orderStatusHistory: { create: jest.fn() },
    };
    const prisma = { $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)) } as never;
    const service = new OrdersService(prisma, { validateForCheckout: jest.fn() } as never, new OrderStatusService(), {} as never, audit as never, {} as never, notifications as never);
    await expect(service.assignCourier('order-1', { courierId: 'c2' })).rejects.toThrow(
      'Courier can only be reassigned before the delivery has started',
    );
    expect(tx.delivery.update).not.toHaveBeenCalled();
  });

  it('adds backend-owned delivery fee for home delivery orders', async () => {
    const purchasableProduct = {
      name: 'Pasta',
      price: '100.00',
      discountedPrice: null,
      status: ProductStatus.ACTIVE,
      isPublished: true,
      saleWindowStart: null,
      saleWindowEnd: null,
      deletedAt: null,
    };
    const tx = {
      cart: { findUnique: jest.fn().mockResolvedValue({ id: 'cart-1', items: [{ productId: 'product-1', quantity: 1, customNote: null, product: purchasableProduct, options: [] }] }) },
      address: { findFirst: jest.fn().mockResolvedValue({ id: 'address-1', title: 'Ev', city: 'Mersin', district: 'Yenişehir', neighborhood: null, fullAddress: 'Adres', building: null, floor: null, apartment: null, directions: null }) },
      deliveryZone: { findFirst: jest.fn().mockResolvedValue({ deliveryFee: '30.00' }) },
      loyaltyAccount: { findUnique: jest.fn().mockResolvedValue(null) },
      loyaltySetting: { findFirst: jest.fn().mockResolvedValue(null) },
      order: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'order-1', ...data })),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'order-1' }),
      },
      orderItem: { create: jest.fn().mockResolvedValue({ id: 'item-1' }) },
      orderStatusHistory: { create: jest.fn() },
      cartItem: { deleteMany: jest.fn() },
    };
    const prisma = { $transaction: jest.fn((fn) => fn(tx)) } as never;
    const service = new OrdersService(prisma, { validateForCheckout: jest.fn() } as never, new OrderStatusService(), {} as never, { log: jest.fn() } as never, {} as never, { createOrderStatusNotification: jest.fn() } as never);
    await service.create('customer-1', { deliveryType: DeliveryType.HOME_DELIVERY, addressId: 'address-1' });
    expect(tx.order.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ deliveryFee: expect.anything(), grandTotal: expect.anything() }) }));
    const data = tx.order.create.mock.calls[0]?.[0].data;
    expect(data.orderNumber).toMatch(/^ORD-\d{8}001$/);
    expect(data.deliveryFee.toString()).toBe('30.00');
    expect(data.grandTotal.toString()).toBe('130');
  });
});
