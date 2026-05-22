import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Order, Payment, Prisma } from '@prisma/client';
import { DeliveryType, OrderStatus, PaymentStatus } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { AuditService } from '../audit/audit.service';
import { AppException } from '../common/exceptions/app.exception';
import { ERROR_CODES } from '../common/constants/error-codes';
import { money } from '../common/utils/money.util';
import { PrismaService } from '../database/prisma.service';
import { QueuesService } from '../jobs/queues.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OrderStatusService } from '../orders/order-status.service';
import type { InitiatePaymentDto } from './dto/initiate-payment.dto';
import type { PaymentCallbackDto } from './dto/payment-callback.dto';
import type { CheckoutFormRetrieveSdkResult } from './providers/iyzico.provider';
import { IyzicoProvider } from './providers/iyzico.provider';

@Injectable()
export class PaymentsService {
  constructor(
    @Inject(ConfigService) private readonly config: ConfigService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(OrderStatusService) private readonly statuses: OrderStatusService,
    @Inject(IyzicoProvider) private readonly provider: IyzicoProvider,
    @Inject(QueuesService) private readonly queues: QueuesService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
  ) {}

  private isPaymentDevAutoSuccessEnabled(): boolean {
    if (process.env.NODE_ENV === 'production') return false;
    const raw = process.env.PAYMENT_DEV_AUTO_SUCCESS ?? this.config.get<string>('PAYMENT_DEV_AUTO_SUCCESS');
    return raw === 'true';
  }

  private getPublicApiBaseUrl(): string {
    const base = this.config.get<string>('PUBLIC_API_URL') ?? this.config.get<string>('API_URL') ?? process.env.PUBLIC_API_URL ?? process.env.API_URL ?? 'http://localhost:3003';
    return base.replace(/\/$/, '');
  }

  private getStorefrontBaseUrl(): string {
    const base = this.config.get<string>('WEB_URL') ?? process.env.WEB_URL ?? 'http://localhost:3000';
    return base.replace(/\/$/, '');
  }

  private checkoutFormCallbackUrl(): string {
    return `${this.getPublicApiBaseUrl()}/api/v1/payments/iyzico/form-return`;
  }

  private async assertNoOtherPendingPayment(orderId: string, idempotencyKey: string) {
    const other = await this.prisma.payment.findFirst({
      where: { orderId, status: PaymentStatus.PENDING, NOT: { idempotencyKey } },
    });
    if (other) {
      throw new AppException(
        ERROR_CODES.PAYMENT_ALREADY_COMPLETED,
        'Bu sipariş için ödeme zaten başlatıldı. Mevcut ödemeyi tamamlayın veya süresinin dolmasını bekleyin.',
        HttpStatus.CONFLICT,
      );
    }
  }

  private formatBuyerGsm(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('90') && digits.length >= 12) return `+${digits}`;
    if (digits.length === 10) return `+90${digits}`;
    if (digits.length === 11 && digits.startsWith('0')) return `+9${digits}`;
    return digits.length ? `+${digits}` : '+905551234567';
  }

  private buildIyzicoBuyerAndAddresses(order: Order & { user: { id: string; firstName: string; lastName: string; phone: string; email: string | null }; pickupStore: { name: string; city: string; district: string; address: string } | null }) {
    const contactName = `${order.user.firstName} ${order.user.lastName}`.trim() || 'Müşteri';
    const country = 'Turkey';
    const identityNumber = '11111111111';
    const lastLogin = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const buyerBase = {
      id: order.userId,
      name: order.user.firstName || 'Müşteri',
      surname: order.user.lastName || 'Müşteri',
      gsmNumber: this.formatBuyerGsm(order.user.phone),
      email: order.user.email?.trim() || `pastane-${order.user.id.slice(0, 8)}@placeholder.pastane`,
      identityNumber,
      lastLoginDate: lastLogin,
      registrationDate: lastLogin,
      city: 'Istanbul',
      country,
      zipCode: '34000',
    };

    if (order.deliveryType === DeliveryType.HOME_DELIVERY) {
      const snap = (order.addressSnapshot ?? null) as Record<string, unknown> | null;
      const city = typeof snap?.city === 'string' ? snap.city : 'Istanbul';
      const district = typeof snap?.district === 'string' ? snap.district : '';
      const full =
        typeof snap?.fullAddress === 'string'
          ? snap.fullAddress
          : [typeof snap?.title === 'string' ? snap.title : '', district].filter(Boolean).join(', ') || 'Teslimat adresi';
      const registrationAddress = full;
      const addr = { contactName, city, country, address: full, zipCode: '34000' };
      return {
        buyer: { ...buyerBase, registrationAddress, city, country },
        shippingAddress: addr,
        billingAddress: addr,
      };
    }

    const store = order.pickupStore;
    if (!store) throw new AppException(ERROR_CODES.ORDER_NOT_FOUND, 'Pickup store missing for order', HttpStatus.BAD_REQUEST);
    const full = `${store.name} — ${store.address}, ${store.district} ${store.city}`;
    const addr = { contactName, city: store.city, country, address: full, zipCode: '34000' };
    return {
      buyer: { ...buyerBase, registrationAddress: full, city: store.city, country },
      shippingAddress: addr,
      billingAddress: addr,
    };
  }

  private async applySuccessfulPaymentInTx(
    tx: Prisma.TransactionClient,
    args: {
      payment: Pick<Payment, 'id' | 'amount' | 'orderId'>;
      order: Order;
      now: Date;
      providerStatus: string;
      auditAction: string;
      processingResult: string;
    },
  ) {
    const { payment, order, now, providerStatus, auditAction, processingResult } = args;
    if (order.status !== OrderStatus.PAYMENT_PENDING) {
      throw new AppException(
        ERROR_CODES.ORDER_STATUS_TRANSITION_INVALID,
        'Order is not in payment pending state',
        HttpStatus.BAD_REQUEST,
      );
    }
    await tx.order.update({ where: { id: order.id }, data: { status: OrderStatus.CONFIRMED } });
    await tx.orderStatusHistory.create({ data: { orderId: order.id, status: OrderStatus.CONFIRMED } });

    if (order.loyaltyPointsUsed > 0) {
      const account = await tx.loyaltyAccount.findUnique({ where: { userId: order.userId } });
      if (!account || account.points < order.loyaltyPointsUsed) {
        throw new AppException(ERROR_CODES.INSUFFICIENT_LOYALTY_POINTS, 'Insufficient loyalty points', HttpStatus.CONFLICT);
      }
      const updated = await tx.loyaltyAccount.update({ where: { id: account.id }, data: { points: { decrement: order.loyaltyPointsUsed } } });
      await tx.loyaltyMovement.create({
        data: { loyaltyAccountId: account.id, type: 'REDEEM', points: -order.loyaltyPointsUsed, balanceAfter: updated.points, note: `Order ${order.orderNumber}` },
      });
    }

    await this.audit.log({ actorId: null, action: auditAction, entityType: 'Payment', entityId: payment.id, newValues: { status: PaymentStatus.SUCCESS, providerStatus } }, tx);
    await this.notifications.createOrderStatusNotification(tx, order.userId, order.orderNumber, OrderStatus.CONFIRMED);
    return tx.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.SUCCESS, providerStatus, processedAt: now, processingResult },
    });
  }

  async initiate(userId: string, dto: InitiatePaymentDto, idempotencyKey: string) {
    const order = await this.prisma.order.findFirst({ where: { id: dto.orderId, userId, deletedAt: null } });
    if (!order || order.status !== OrderStatus.PAYMENT_PENDING) {
      throw new AppException(ERROR_CODES.ORDER_NOT_FOUND, 'Order not payable', HttpStatus.BAD_REQUEST);
    }
    const existing = await this.prisma.payment.findUnique({ where: { idempotencyKey } });
    if (existing) return existing;

    await this.assertNoOtherPendingPayment(order.id, idempotencyKey);

    const providerResponse = await this.provider.initiate(dto, randomUUID());
    if (this.isPaymentDevAutoSuccessEnabled()) {
      return this.prisma.$transaction(async (tx) => {
        const payment = await tx.payment.create({
          data: {
            orderId: order.id, idempotencyKey, providerPaymentId: providerResponse.providerPaymentId,
            conversationId: providerResponse.conversationId, providerToken: providerResponse.redirectUrl, amount: order.grandTotal,
          },
        });
        const o = await tx.order.findUniqueOrThrow({ where: { id: payment.orderId } });
        if (money.compare(payment.amount, o.grandTotal) !== 0) {
          throw new AppException(ERROR_CODES.PAYMENT_AMOUNT_MISMATCH, 'Amount mismatch', HttpStatus.CONFLICT);
        }
        const now = new Date();
        if (o.status !== OrderStatus.PAYMENT_PENDING) {
          throw new AppException(ERROR_CODES.ORDER_STATUS_TRANSITION_INVALID, 'Order not payable', HttpStatus.BAD_REQUEST);
        }
        return this.applySuccessfulPaymentInTx(tx, {
          payment,
          order: o,
          now,
          providerStatus: 'DEV',
          auditAction: 'payment.dev.auto_success',
          processingResult: 'DEV_AUTO_SUCCESS',
        });
      });
    }

    const payment = await this.prisma.payment.create({
      data: {
        orderId: order.id, idempotencyKey, providerPaymentId: providerResponse.providerPaymentId,
        conversationId: providerResponse.conversationId, providerToken: providerResponse.redirectUrl, amount: order.grandTotal,
      },
    });
    await this.queues.schedulePaymentTimeout(payment.id);
    return payment;
  }

  async callback(dto: PaymentCallbackDto, raw: Record<string, unknown>) {
    if (!this.provider.verifyCallback(raw)) throw new AppException(ERROR_CODES.PAYMENT_CALLBACK_INVALID, 'Invalid callback', HttpStatus.BAD_REQUEST);
    const safePayload = this.provider.sanitize(raw);
    const payloadHash = createHash('sha256').update(JSON.stringify(safePayload)).digest('hex');
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({ where: { conversationId: dto.conversationId, providerPaymentId: dto.providerPaymentId } });
      if (!payment) throw new AppException(ERROR_CODES.PAYMENT_NOT_FOUND, 'Payment not found', HttpStatus.NOT_FOUND);

      const lock = await tx.payment.updateMany({
        where: { id: payment.id, status: PaymentStatus.PENDING },
        data: { receivedAt: now, providerStatus: dto.status, callbackPayloadHash: payloadHash, processingResult: 'PROCESSING' },
      });
      if (lock.count === 0) return tx.payment.findUniqueOrThrow({ where: { id: payment.id } });

      const order = await tx.order.findUniqueOrThrow({ where: { id: payment.orderId } });
      if (money.compare(payment.amount, order.grandTotal) !== 0) {
        return tx.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.FAILED, processedAt: now, processingResult: 'AMOUNT_MISMATCH', failureReason: 'Amount mismatch' },
        });
      }

      if (order.status !== OrderStatus.PAYMENT_PENDING) {
        return tx.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.FAILED, processedAt: now, processingResult: 'ORDER_INVALID', failureReason: 'Order not payable' },
        });
      }

      if (dto.status === 'FAILED') {
        this.statuses.assert(order.status, OrderStatus.CANCELLED);
        await tx.order.update({ where: { id: order.id }, data: { status: OrderStatus.CANCELLED } });
        await tx.orderStatusHistory.create({ data: { orderId: order.id, status: OrderStatus.CANCELLED } });
        await this.audit.log({ actorId: null, action: 'payment.callback.failed', entityType: 'Payment', entityId: payment.id, newValues: { status: PaymentStatus.FAILED, providerStatus: dto.status } }, tx);
        await this.notifications.createOrderStatusNotification(tx, order.userId, order.orderNumber, OrderStatus.CANCELLED);
        return tx.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.FAILED, providerStatus: dto.status, processedAt: now, processingResult: 'FAILED' },
        });
      }

      return this.applySuccessfulPaymentInTx(tx, {
        payment,
        order,
        now,
        providerStatus: dto.status,
        auditAction: 'payment.callback.success',
        processingResult: 'SUCCESS',
      });
    });
  }

  async initiateCheckoutForm(userId: string, orderId: string, idempotencyKey: string): Promise<{ checkoutFormContent: string }> {
    this.provider.assertCheckoutConfigured();
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId, deletedAt: null },
      include: { user: true, pickupStore: true, items: { include: { product: { include: { category: true } } } } },
    });
    if (!order || order.status !== OrderStatus.PAYMENT_PENDING) {
      throw new AppException(ERROR_CODES.ORDER_NOT_FOUND, 'Order not payable', HttpStatus.BAD_REQUEST);
    }

    const existing = await this.prisma.payment.findUnique({ where: { idempotencyKey } });
    if (existing) {
      const payload = existing.responsePayload as { checkoutFormContent?: string } | null | undefined;
      if (payload && typeof payload.checkoutFormContent === 'string') {
        return { checkoutFormContent: payload.checkoutFormContent };
      }
      throw new AppException(
        ERROR_CODES.PAYMENT_ALREADY_COMPLETED,
        'Bu iyzico ödeme oturumu zaten oluşturuldu; sayfayı yenileyin veya farklı bir ödeme yöntemi deneyin.',
        HttpStatus.CONFLICT,
      );
    }

    await this.assertNoOtherPendingPayment(order.id, idempotencyKey);

    const { buyer, shippingAddress, billingAddress } = this.buildIyzicoBuyerAndAddresses(order);
    const grandStr = money.round(order.grandTotal).toFixed(2);

    const basketItems: Array<{ id: string; name: string; category1: string; itemType: string; price: string }> =
      order.items.length > 0
        ? order.items.map((item) => {
            const line = money.multiply(item.unitPriceSnapshot, item.quantity);
            const cat = item.product?.category?.name ?? 'Pastane';
            return {
              id: item.id,
              name: item.productNameSnapshot,
              category1: cat,
              itemType: 'PHYSICAL',
              price: money.round(line).toFixed(2),
            };
          })
        : [
            {
              id: order.id,
              name: `Sipariş ${order.orderNumber}`,
              category1: 'Pastane',
              itemType: 'PHYSICAL',
              price: grandStr,
            },
          ];

    let sum = money.of(0);
    for (const b of basketItems) {
      sum = money.add(sum, b.price);
    }
    if (money.compare(money.round(sum), money.round(order.grandTotal)) !== 0) {
      basketItems.length = 0;
      basketItems.push({
        id: order.id,
        name: `Sipariş ${order.orderNumber}`,
        category1: 'Pastane',
        itemType: 'PHYSICAL',
        price: grandStr,
      });
    }

    const conversationId = randomUUID();
    const sdkRequest = {
      locale: 'tr',
      conversationId,
      price: grandStr,
      paidPrice: grandStr,
      currency: 'TRY',
      basketId: order.id,
      paymentGroup: 'PRODUCT',
      callbackUrl: this.checkoutFormCallbackUrl(),
      enabledInstallments: [1, 2, 3, 6, 9],
      buyer: {
        ...buyer,
        ip: '85.34.78.112',
      },
      shippingAddress,
      billingAddress,
      basketItems,
    };

    let sdkResult;
    try {
      sdkResult = await this.provider.checkoutFormInitialize(sdkRequest);
    } catch {
      throw new AppException(ERROR_CODES.INTERNAL_SERVER_ERROR, 'iyzico bağlantı hatası', HttpStatus.BAD_GATEWAY);
    }

    if (sdkResult.status !== 'success' || !sdkResult.token || !sdkResult.checkoutFormContent) {
      throw new AppException(
        ERROR_CODES.VALIDATION_FAILED,
        typeof sdkResult.errorMessage === 'string' ? sdkResult.errorMessage : 'Ödeme formu başlatılamadı',
        HttpStatus.BAD_REQUEST,
      );
    }

    const payment = await this.prisma.payment.create({
      data: {
        orderId: order.id,
        idempotencyKey,
        providerPaymentId: null,
        conversationId,
        providerToken: sdkResult.token,
        amount: order.grandTotal,
        responsePayload: {
          checkoutFormContent: sdkResult.checkoutFormContent,
          iyzicoConversationId: sdkResult.conversationId ?? conversationId,
        } as Prisma.InputJsonValue,
      },
    });
    await this.queues.schedulePaymentTimeout(payment.id);

    return { checkoutFormContent: sdkResult.checkoutFormContent };
  }

  async finalizeCheckoutFormReturnRedirectUrl(token: string | undefined): Promise<string> {
    const web = this.getStorefrontBaseUrl();
    const failUrl = (orderId?: string) =>
      orderId
        ? `${web}/odeme?durum=basarisiz&orderId=${encodeURIComponent(orderId)}`
        : `${web}/odeme?durum=basarisiz`;

    if (!token?.length) return failUrl();

    const pay0 = await this.prisma.payment.findFirst({ where: { providerToken: token } });
    if (!pay0) return failUrl();
    if (pay0.status === PaymentStatus.SUCCESS) {
      return `${web}/siparisler`;
    }
    if (pay0.status !== PaymentStatus.PENDING) return failUrl(pay0.orderId);
    if (!pay0.conversationId) return failUrl(pay0.orderId);

    let retrieve: CheckoutFormRetrieveSdkResult;
    try {
      retrieve = await this.provider.checkoutFormRetrieve({
        locale: 'tr',
        token,
        conversationId: pay0.conversationId,
      });
    } catch {
      return failUrl(pay0.orderId);
    }

    if (retrieve.conversationId && retrieve.conversationId !== pay0.conversationId) {
      return failUrl(pay0.orderId);
    }

    const paymentSuccess = retrieve.status === 'success' && retrieve.paymentStatus === 'SUCCESS';
    const dtoStatus = paymentSuccess ? ('SUCCESS' as const) : ('FAILED' as const);

    const raw = retrieve as unknown as Record<string, unknown>;
    if (!this.provider.verifyCallback(raw)) return failUrl(pay0.orderId);

    const safePayload = this.provider.sanitize(raw);
    const payloadHash = createHash('sha256').update(JSON.stringify(safePayload)).digest('hex');
    const now = new Date();

    const lockData: Prisma.PaymentUpdateManyMutationInput = {
      receivedAt: now,
      providerStatus: dtoStatus,
      callbackPayloadHash: payloadHash,
      processingResult: 'PROCESSING',
      responsePayload: retrieve as unknown as Prisma.InputJsonValue,
    };
    if (typeof retrieve.paymentId === 'string' && retrieve.paymentId.length > 0) {
      lockData.providerPaymentId = retrieve.paymentId;
    }

    await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({ where: { id: pay0.id } });
      if (!payment || payment.status !== PaymentStatus.PENDING) return;

      const lock = await tx.payment.updateMany({
        where: { id: payment.id, status: PaymentStatus.PENDING },
        data: lockData,
      });
      if (lock.count === 0) return;

      const order = await tx.order.findUniqueOrThrow({ where: { id: payment.orderId } });
      if (money.compare(payment.amount, order.grandTotal) !== 0) {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.FAILED, processedAt: now, processingResult: 'AMOUNT_MISMATCH', failureReason: 'Amount mismatch' },
        });
        return;
      }

      if (order.status !== OrderStatus.PAYMENT_PENDING) {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.FAILED, processedAt: now, processingResult: 'ORDER_INVALID', failureReason: 'Order not payable' },
        });
        return;
      }

      if (dtoStatus === 'FAILED') {
        this.statuses.assert(order.status, OrderStatus.CANCELLED);
        await tx.order.update({ where: { id: order.id }, data: { status: OrderStatus.CANCELLED } });
        await tx.orderStatusHistory.create({ data: { orderId: order.id, status: OrderStatus.CANCELLED } });
        await this.audit.log(
          { actorId: null, action: 'payment.iyzico.checkout.failed', entityType: 'Payment', entityId: payment.id, newValues: { status: PaymentStatus.FAILED, providerStatus: dtoStatus } },
          tx,
        );
        await this.notifications.createOrderStatusNotification(tx, order.userId, order.orderNumber, OrderStatus.CANCELLED);
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.FAILED, providerStatus: dtoStatus, processedAt: now, processingResult: 'FAILED' },
        });
        return;
      }

      await this.applySuccessfulPaymentInTx(tx, {
        payment,
        order,
        now,
        providerStatus: retrieve.paymentStatus ?? dtoStatus,
        auditAction: 'payment.iyzico.checkout.success',
        processingResult: 'SUCCESS',
      });
    });

    const refreshed = await this.prisma.payment.findFirst({ where: { id: pay0.id } });
    if (refreshed?.status === PaymentStatus.SUCCESS) {
      return `${web}/siparisler`;
    }
    return failUrl(pay0.orderId);
  }

  async findOwn(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, userId, deletedAt: null } });
    if (!order) throw new AppException(ERROR_CODES.ORDER_NOT_FOUND, 'Order not found', HttpStatus.NOT_FOUND);
    return this.prisma.payment.findMany({ where: { orderId }, orderBy: { createdAt: 'desc' } });
  }

  async timeout(paymentId: string) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id: paymentId } });
      if (!payment || payment.status !== PaymentStatus.PENDING) return null;
      const order = await tx.order.findUniqueOrThrow({ where: { id: payment.orderId } });
      if (order.status !== OrderStatus.PAYMENT_PENDING) return payment;
      await tx.order.update({ where: { id: order.id }, data: { status: OrderStatus.CANCELLED } });
      await tx.orderStatusHistory.create({ data: { orderId: order.id, status: OrderStatus.CANCELLED } });
      await this.audit.log({ actorId: null, action: 'payment.timeout', entityType: 'Payment', entityId: payment.id, newValues: { status: PaymentStatus.TIMEOUT } }, tx);
      await this.notifications.createOrderStatusNotification(tx, order.userId, order.orderNumber, OrderStatus.CANCELLED);
      return tx.payment.update({ where: { id: payment.id }, data: { status: PaymentStatus.TIMEOUT, processedAt: new Date(), processingResult: 'TIMEOUT' } });
    });
  }
}
