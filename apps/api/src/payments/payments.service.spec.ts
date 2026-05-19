import type { ConfigService } from '@nestjs/config';
import { DeliveryType, OrderStatus, PaymentStatus, StockReservationStatus, type Order, type StockReservation } from '@prisma/client';
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

  function reservation(): StockReservation {
    return {
      id: 'res-1',
      orderId: 'order-1',
      orderItemId: null,
      productId: 'product-1',
      stockEntryId: 'se-1',
      quantity: 1,
      status: StockReservationStatus.ACTIVE,
      expiresAt: new Date(Date.now() + 60_000),
      confirmedAt: null,
      releasedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  it('schedules payment timeout in production even if PAYMENT_DEV_AUTO_SUCCESS is true', async () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const config = { get: jest.fn((k: string) => (k === 'PAYMENT_DEV_AUTO_SUCCESS' ? 'true' : undefined)) } as unknown as ConfigService;
      const schedulePaymentTimeout = jest.fn();
      const paymentCreate = jest.fn().mockResolvedValue({ id: 'pay-1', orderId: 'order-1', amount: new Decimal('100') });
      const prismaMock = {
        order: { findFirst: jest.fn().mockResolvedValue(baseOrder()) },
        payment: { findUnique: jest.fn().mockResolvedValue(null), findFirst: jest.fn().mockResolvedValue(null), create: paymentCreate },
        stockReservation: { findMany: jest.fn().mockResolvedValue([reservation()]) },
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

      await service.initiate('user-1', dto, 'idem-1');
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
      expect(schedulePaymentTimeout).toHaveBeenCalledWith('pay-1');
    } finally {
      process.env.NODE_ENV = prev;
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
      const resRow = reservation();
      const createdPayment = { id: 'pay-1', orderId: 'order-1', amount: new Decimal('100') };

      const stockEntry = { update: jest.fn() };
      const stockReservation = {
        findMany: jest.fn().mockResolvedValue([resRow]),
        updateMany: jest.fn(),
      };
      const order = { findUniqueOrThrow: jest.fn().mockResolvedValue(orderRow), update: jest.fn() };
      const orderStatusHistory = { create: jest.fn() };
      const payment = {
        create: jest.fn().mockResolvedValue(createdPayment),
        update: jest.fn().mockResolvedValue({ ...createdPayment, status: 'SUCCESS' }),
      };
      const loyaltyAccount = { findUnique: jest.fn() };
      const tx = { stockEntry, stockReservation, order, orderStatusHistory, payment, loyaltyAccount, loyaltyMovement: { create: jest.fn() } };

      const prismaMock = {
        order: { findFirst: jest.fn().mockResolvedValue(orderRow) },
        payment: { findUnique: jest.fn().mockResolvedValue(null), findFirst: jest.fn().mockResolvedValue(null) },
        stockReservation: { findMany: jest.fn().mockResolvedValue([resRow]) },
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
      expect(stockEntry.update).toHaveBeenCalled();
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
      const resRow = reservation();
      const createdPayment = { id: 'pay-1', orderId: 'order-1', amount: new Decimal('100') };

      const stockEntry = { update: jest.fn() };
      const stockReservation = {
        findMany: jest.fn().mockResolvedValue([resRow]),
        updateMany: jest.fn(),
      };
      const order = { findUniqueOrThrow: jest.fn().mockResolvedValue(orderRow), update: jest.fn() };
      const orderStatusHistory = { create: jest.fn() };
      const payment = {
        create: jest.fn().mockResolvedValue(createdPayment),
        update: jest.fn().mockResolvedValue({ ...createdPayment, status: 'SUCCESS' }),
      };
      const loyaltyAccount = { findUnique: jest.fn() };
      const tx = { stockEntry, stockReservation, order, orderStatusHistory, payment, loyaltyAccount, loyaltyMovement: { create: jest.fn() } };

      const prismaMock = {
        order: { findFirst: jest.fn().mockResolvedValue(orderRow) },
        payment: { findUnique: jest.fn().mockResolvedValue(null), findFirst: jest.fn().mockResolvedValue(null) },
        stockReservation: { findMany: jest.fn().mockResolvedValue([resRow]) },
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
        stockReservation: { findMany: jest.fn() },
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
      expect(prismaMock.stockReservation.findMany).not.toHaveBeenCalled();
    } finally {
      process.env.NODE_ENV = prev;
    }
  });
});
