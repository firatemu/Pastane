import type { ConfigService } from '@nestjs/config';
import { DeliveryType, OrderStatus, PaymentStatus, ProductStatus, type Order } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { AppException } from '../common/exceptions/app.exception';
import { ERROR_CODES } from '../common/constants/error-codes';
import type { PrismaService } from '../database/prisma.service';
import { OrderStatusService } from '../orders/order-status.service';
import { PaymentsService } from './payments.service';

describe('PaymentsService initiate', () => {
  const dto = {
    orderId: 'order-1',
    cardHolderName: 'Test User',
    cardNumber: '4242424242424242',
    expireMonth: '12',
    expireYear: '30',
    cvc: '123',
  };

  function baseOrder(): Order {
    return {
      id: 'order-1',
      orderNumber: 'PN-1',
      userId: 'user-1',
      deliveryType: DeliveryType.HOME_DELIVERY,
      status: OrderStatus.PAYMENT_PENDING,
      addressSnapshot: null,
      pickupStoreId: null,
      scheduledAt: null,
      subtotal: new Decimal('100'),
      deliveryFee: new Decimal('0'),
      serviceFee: new Decimal('0'),
      loyaltyDiscount: new Decimal('0'),
      loyaltyPointsUsed: 0,
      grandTotal: new Decimal('100'),
      note: null,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  it('schedules payment timeout in production when dev payment bypass is disabled', async () => {
    const prev = process.env.NODE_ENV;
    const prevPay = process.env.PAYMENT_DEV_AUTO_SUCCESS;
    delete process.env.PAYMENT_DEV_AUTO_SUCCESS;
    process.env.NODE_ENV = 'production';
    try {
      const config = { get: jest.fn(() => undefined) } as unknown as ConfigService;
      const schedulePaymentTimeout = jest.fn();
      const paymentCreate = jest.fn().mockResolvedValue({ id: 'pay-1', orderId: 'order-1', amount: new Decimal('100') });
      const prismaMock = {
        order: { findFirst: jest.fn().mockResolvedValue(baseOrder()) },
        payment: { findUnique: jest.fn().mockResolvedValue(null), findFirst: jest.fn().mockResolvedValue(null), create: paymentCreate },
        $transaction: jest.fn(),
      };
      const prisma = prismaMock as unknown as PrismaService;

      const service = new PaymentsService(
        config,
        prisma,
        new OrderStatusService(),
        { initiate: jest.fn().mockResolvedValue({ providerPaymentId: 'p', conversationId: 'c', redirectUrl: 'http://x' }) } as never,
        { schedulePaymentTimeout } as never,
        { log: jest.fn() } as never,
        { createOrderStatusNotification: jest.fn() } as never,
      );
      service.onModuleInit();

      await service.initiate('user-1', dto, 'idem-1');
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
      expect(schedulePaymentTimeout).toHaveBeenCalledWith('pay-1');
    } finally {
      process.env.NODE_ENV = prev;
      if (prevPay === undefined) delete process.env.PAYMENT_DEV_AUTO_SUCCESS;
      else process.env.PAYMENT_DEV_AUTO_SUCCESS = prevPay;
    }
  });

  it('throws on module init in production when PAYMENT_DEV_AUTO_SUCCESS is enabled via ConfigService', () => {
    const prev = process.env.NODE_ENV;
    const prevPay = process.env.PAYMENT_DEV_AUTO_SUCCESS;
    delete process.env.PAYMENT_DEV_AUTO_SUCCESS;
    process.env.NODE_ENV = 'production';
    try {
      const config = { get: jest.fn((k: string) => (k === 'PAYMENT_DEV_AUTO_SUCCESS' ? 'true' : undefined)) } as unknown as ConfigService;
      const prisma = { order: {}, payment: {}, $transaction: jest.fn() } as unknown as PrismaService;

      const service = new PaymentsService(
        config,
        prisma,
        new OrderStatusService(),
        {} as never,
        { schedulePaymentTimeout: jest.fn() } as never,
        { log: jest.fn() } as never,
        { createOrderStatusNotification: jest.fn() } as never,
      );
      expect(() => service.onModuleInit()).toThrow(/PAYMENT_DEV_AUTO_SUCCESS/i);
    } finally {
      process.env.NODE_ENV = prev;
      if (prevPay === undefined) delete process.env.PAYMENT_DEV_AUTO_SUCCESS;
      else process.env.PAYMENT_DEV_AUTO_SUCCESS = prevPay;
    }
  });

  it('finalizes payment in one transaction and skips timeout when dev auto success is enabled', async () => {
    const prevNode = process.env.NODE_ENV;
    const prevPay = process.env.PAYMENT_DEV_AUTO_SUCCESS;
    delete process.env.PAYMENT_DEV_AUTO_SUCCESS;
    process.env.NODE_ENV = 'test';
    try {
      const config = { get: jest.fn((k: string) => (k === 'PAYMENT_DEV_AUTO_SUCCESS' ? 'true' : undefined)) } as unknown as ConfigService;
      const schedulePaymentTimeout = jest.fn();
      const orderRow = baseOrder();
      const createdPayment = { id: 'pay-1', orderId: 'order-1', amount: new Decimal('100') };

      const order = { findUniqueOrThrow: jest.fn().mockResolvedValue(orderRow), update: jest.fn() };
      const orderStatusHistory = { create: jest.fn() };
      const payment = {
        create: jest.fn().mockResolvedValue(createdPayment),
        update: jest.fn().mockResolvedValue({ ...createdPayment, status: 'SUCCESS' }),
      };
      const loyaltyAccount = { findUnique: jest.fn() };
      const tx = { order, orderStatusHistory, payment, loyaltyAccount, loyaltyMovement: { create: jest.fn() } };

      const prismaMock = {
        order: { findFirst: jest.fn().mockResolvedValue(orderRow) },
        payment: { findUnique: jest.fn().mockResolvedValue(null), findFirst: jest.fn().mockResolvedValue(null) },
        $transaction: jest.fn(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
      };
      const prisma = prismaMock as unknown as PrismaService;

      const statuses = { assert: jest.fn() } as unknown as OrderStatusService;
      const audit = { log: jest.fn() };

      const service = new PaymentsService(
        config,
        prisma,
        statuses,
        { initiate: jest.fn().mockResolvedValue({ providerPaymentId: 'p', conversationId: 'c', redirectUrl: 'http://x' }) } as never,
        { schedulePaymentTimeout } as never,
        audit as never,
        { createOrderStatusNotification: jest.fn() } as never,
      );

      await service.initiate('user-1', dto, 'idem-1');
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
      expect(schedulePaymentTimeout).not.toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'payment.dev.auto_success' }), expect.anything());
    } finally {
      process.env.NODE_ENV = prevNode;
      if (prevPay === undefined) delete process.env.PAYMENT_DEV_AUTO_SUCCESS;
      else process.env.PAYMENT_DEV_AUTO_SUCCESS = prevPay;
    }
  });

  it('honors process.env PAYMENT_DEV_AUTO_SUCCESS when ConfigService omits it', async () => {
    const prevNode = process.env.NODE_ENV;
    const prevPay = process.env.PAYMENT_DEV_AUTO_SUCCESS;
    process.env.NODE_ENV = 'test';
    process.env.PAYMENT_DEV_AUTO_SUCCESS = 'true';
    try {
      const config = { get: jest.fn(() => undefined) } as unknown as ConfigService;
      const schedulePaymentTimeout = jest.fn();
      const orderRow = baseOrder();
      const createdPayment = { id: 'pay-1', orderId: 'order-1', amount: new Decimal('100') };

      const order = { findUniqueOrThrow: jest.fn().mockResolvedValue(orderRow), update: jest.fn() };
      const orderStatusHistory = { create: jest.fn() };
      const payment = {
        create: jest.fn().mockResolvedValue(createdPayment),
        update: jest.fn().mockResolvedValue({ ...createdPayment, status: 'SUCCESS' }),
      };
      const loyaltyAccount = { findUnique: jest.fn() };
      const tx = { order, orderStatusHistory, payment, loyaltyAccount, loyaltyMovement: { create: jest.fn() } };

      const prismaMock = {
        order: { findFirst: jest.fn().mockResolvedValue(orderRow) },
        payment: { findUnique: jest.fn().mockResolvedValue(null), findFirst: jest.fn().mockResolvedValue(null) },
        $transaction: jest.fn(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
      };
      const prisma = prismaMock as unknown as PrismaService;

      const service = new PaymentsService(
        config,
        prisma,
        { assert: jest.fn() } as unknown as OrderStatusService,
        { initiate: jest.fn().mockResolvedValue({ providerPaymentId: 'p', conversationId: 'c', redirectUrl: 'http://x' }) } as never,
        { schedulePaymentTimeout } as never,
        { log: jest.fn() } as never,
        { createOrderStatusNotification: jest.fn() } as never,
      );

      await service.initiate('user-1', dto, 'idem-1');
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
      expect(schedulePaymentTimeout).not.toHaveBeenCalled();
    } finally {
      process.env.NODE_ENV = prevNode;
      if (prevPay === undefined) delete process.env.PAYMENT_DEV_AUTO_SUCCESS;
      else process.env.PAYMENT_DEV_AUTO_SUCCESS = prevPay;
    }
  });

  it('rejects initiate when another pending payment exists for the same order', async () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const config = { get: jest.fn() } as unknown as ConfigService;
      const prismaMock = {
        order: { findFirst: jest.fn().mockResolvedValue(baseOrder()) },
        payment: {
          findUnique: jest.fn().mockResolvedValue(null),
          findFirst: jest.fn().mockResolvedValue({
            id: 'pay-other',
            orderId: 'order-1',
            status: PaymentStatus.PENDING,
            idempotencyKey: 'user-1:order-1:iyzico-cf',
          }),
        },
        $transaction: jest.fn(),
      };
      const prisma = prismaMock as unknown as PrismaService;

      const service = new PaymentsService(
        config,
        prisma,
        new OrderStatusService(),
        { initiate: jest.fn() } as never,
        { schedulePaymentTimeout: jest.fn() } as never,
        { log: jest.fn() } as never,
        { createOrderStatusNotification: jest.fn() } as never,
      );

      try {
        await service.initiate('user-1', dto, 'user-1:order-1');
        throw new Error('expected rejection');
      } catch (e) {
        expect(e).toBeInstanceOf(AppException);
        expect((e as AppException).getResponse()).toMatchObject({ code: ERROR_CODES.PAYMENT_ALREADY_COMPLETED });
      }
    } finally {
      process.env.NODE_ENV = prev;
    }
  });
});

describe('PaymentsService initiateCheckoutForm', () => {
  const checkoutForm = '<form>iyzico</form>';

  function payableOrder() {
    return {
      id: 'order-1',
      orderNumber: 'PN-1',
      userId: 'user-1',
      deliveryType: DeliveryType.HOME_DELIVERY,
      status: OrderStatus.PAYMENT_PENDING,
      addressSnapshot: { district: 'Yenişehir', city: 'Mersin', title: 'ev', fullAddress: 'Test' },
      pickupStoreId: null,
      scheduledAt: null,
      subtotal: new Decimal('125'),
      deliveryFee: new Decimal('40'),
      serviceFee: new Decimal('0'),
      loyaltyDiscount: new Decimal('0'),
      loyaltyPointsUsed: 0,
      grandTotal: new Decimal('165'),
      note: null,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: {
        id: 'user-1',
        firstName: 'Test',
        lastName: 'User',
        phone: '905550000010',
        email: 'test@example.com',
      },
      pickupStore: null,
      items: [
        {
          id: 'line-1',
          quantity: 1,
          unitPriceSnapshot: new Decimal('125'),
          productNameSnapshot: 'Profiterol',
          product: {
            status: ProductStatus.ACTIVE,
            isPublished: true,
            deletedAt: null,
            saleWindowStart: null,
            saleWindowEnd: null,
            category: { name: 'Tatlılar' },
          },
        },
      ],
    };
  }

  it('reuses checkout form from another pending payment without creating a duplicate conversationId row', async () => {
    const config = { get: jest.fn() } as unknown as ConfigService;
    const paymentCreate = jest.fn();
    const prismaMock = {
      order: { findFirst: jest.fn().mockResolvedValue(payableOrder()) },
      payment: {
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'pay-web',
            orderId: 'order-1',
            status: PaymentStatus.PENDING,
            idempotencyKey: 'order-1:iyzico-web',
            conversationId: 'conv-shared',
            providerToken: 'token-1',
            responsePayload: { checkoutFormContent: checkoutForm },
            createdAt: new Date(),
          },
        ]),
        create: paymentCreate,
      },
    };
    const prisma = prismaMock as unknown as PrismaService;
    const provider = {
      assertCheckoutConfigured: jest.fn(),
      checkoutFormInitialize: jest.fn(),
    };

    const service = new PaymentsService(
      config,
      prisma,
      new OrderStatusService(),
      provider as never,
      { schedulePaymentTimeout: jest.fn() } as never,
      { log: jest.fn() } as never,
      { createOrderStatusNotification: jest.fn() } as never,
    );

    const result = await service.initiateCheckoutForm('user-1', 'order-1', 'order-1:iyzico-mobile');
    expect(result.checkoutFormContent).toBe(checkoutForm);
    expect(paymentCreate).not.toHaveBeenCalled();
    expect(provider.checkoutFormInitialize).not.toHaveBeenCalled();
  });

  it('uses the mobile iyzico channel for mobile checkout init requests', async () => {
    const config = { get: jest.fn() } as unknown as ConfigService;
    const paymentCreate = jest.fn().mockResolvedValue({ id: 'pay-mobile-new' });
    const checkoutFormInitialize = jest.fn().mockImplementation(async (_request, channel: 'web' | 'mobile') => {
      if (channel !== 'mobile') {
        return {
          status: 'failure',
          errorMessage: 'wrong channel',
        };
      }

      return {
        status: 'success',
        token: 'tok-mobile',
        checkoutFormContent: checkoutForm,
        conversationId: 'conv-mobile',
      };
    });
    const prismaMock = {
      order: { findFirst: jest.fn().mockResolvedValue(payableOrder()) },
      payment: {
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        create: paymentCreate,
      },
    };
    const prisma = prismaMock as unknown as PrismaService;
    const provider = {
      assertCheckoutConfigured: jest.fn(),
      checkoutFormInitialize,
    };

    const service = new PaymentsService(
      config,
      prisma,
      new OrderStatusService(),
      provider as never,
      { schedulePaymentTimeout: jest.fn() } as never,
      { log: jest.fn() } as never,
      { createOrderStatusNotification: jest.fn() } as never,
    );

    const result = await service.initiateCheckoutForm('user-1', 'order-1', 'order-1:iyzico-mobile');
    expect(result.checkoutFormContent).toBe(checkoutForm);
    expect(provider.assertCheckoutConfigured).toHaveBeenCalledWith('mobile');
    expect(checkoutFormInitialize).toHaveBeenCalledWith(expect.anything(), 'mobile');
    expect(paymentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ idempotencyKey: 'order-1:iyzico-mobile' }),
      }),
    );
  });

  it('keeps using the web iyzico channel for web checkout init requests', async () => {
    const config = { get: jest.fn() } as unknown as ConfigService;
    const paymentCreate = jest.fn().mockResolvedValue({ id: 'pay-web-new' });
    const checkoutFormInitialize = jest.fn().mockResolvedValue({
      status: 'success',
      token: 'tok-web',
      checkoutFormContent: checkoutForm,
      conversationId: 'conv-web',
    });
    const prismaMock = {
      order: { findFirst: jest.fn().mockResolvedValue(payableOrder()) },
      payment: {
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        create: paymentCreate,
      },
    };
    const prisma = prismaMock as unknown as PrismaService;
    const provider = {
      assertCheckoutConfigured: jest.fn(),
      checkoutFormInitialize,
    };

    const service = new PaymentsService(
      config,
      prisma,
      new OrderStatusService(),
      provider as never,
      { schedulePaymentTimeout: jest.fn() } as never,
      { log: jest.fn() } as never,
      { createOrderStatusNotification: jest.fn() } as never,
    );

    const result = await service.initiateCheckoutForm('user-1', 'order-1', 'order-1:iyzico-web');
    expect(result.checkoutFormContent).toBe(checkoutForm);
    expect(provider.assertCheckoutConfigured).toHaveBeenCalledWith('web');
    expect(checkoutFormInitialize).toHaveBeenCalledWith(expect.anything(), 'web');
    expect(paymentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ idempotencyKey: 'order-1:iyzico-web' }),
      }),
    );
  });

  it('supersedes stale same-key payment without form and creates a fresh checkout row', async () => {
    const config = { get: jest.fn() } as unknown as ConfigService;
    const paymentUpdate = jest.fn().mockResolvedValue({});
    const paymentCreate = jest.fn().mockResolvedValue({ id: 'pay-mobile-new' });
    const prismaMock = {
      order: { findFirst: jest.fn().mockResolvedValue(payableOrder()) },
      payment: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'pay-stale',
          orderId: 'order-1',
          status: PaymentStatus.PENDING,
          idempotencyKey: 'order-1:iyzico-mobile',
          responsePayload: {},
          createdAt: new Date(),
        }),
        findMany: jest.fn().mockResolvedValue([]),
        create: paymentCreate,
        update: paymentUpdate,
      },
    };
    const prisma = prismaMock as unknown as PrismaService;
    const provider = {
      assertCheckoutConfigured: jest.fn(),
      checkoutFormInitialize: jest.fn().mockResolvedValue({
        status: 'success',
        token: 'tok-1',
        checkoutFormContent: checkoutForm,
        conversationId: 'conv-new',
      }),
    };

    const service = new PaymentsService(
      config,
      prisma,
      new OrderStatusService(),
      provider as never,
      { schedulePaymentTimeout: jest.fn() } as never,
      { log: jest.fn() } as never,
      { createOrderStatusNotification: jest.fn() } as never,
    );

    const result = await service.initiateCheckoutForm('user-1', 'order-1', 'order-1:iyzico-mobile');
    expect(result.checkoutFormContent).toBe(checkoutForm);
    expect(paymentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'pay-stale' },
        data: expect.objectContaining({
          status: PaymentStatus.FAILED,
          idempotencyKey: expect.stringContaining('order-1:iyzico-mobile:superseded:'),
        }),
      }),
    );
    expect(paymentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ idempotencyKey: 'order-1:iyzico-mobile' }),
      }),
    );
  });
});
