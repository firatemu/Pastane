import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import type { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Order, Payment, Prisma } from '@prisma/client';
import { DeliveryType, OrderStatus, PaymentStatus } from '@prisma/client';
import { appendFileSync } from 'node:fs';
import { createHash, randomUUID } from 'crypto';
import { AuditService } from '../audit/audit.service';
import { AppException } from '../common/exceptions/app.exception';
import { ERROR_CODES } from '../common/constants/error-codes';
import { money } from '../common/utils/money.util';
import { PrismaService } from '../database/prisma.service';
import { QueuesService } from '../jobs/queues.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OrderStatusService } from '../orders/order-status.service';
import { computeProductAvailability } from '../products/product-availability.util';
import type { InitiatePaymentDto } from './dto/initiate-payment.dto';
import type { PaymentCallbackDto } from './dto/payment-callback.dto';
import type { CheckoutFormRetrieveSdkResult } from './providers/iyzico.provider';
import {
  buildIyzicoCheckoutSdkRequest,
  extractCheckoutFormContent,
} from './iyzico-checkout.util';
import { friendlyIyzicoInitError, sanitizeIyzicoText } from './iyzico-text.util';
import { IyzicoProvider } from './providers/iyzico.provider';
import { assertForbiddenPaymentDevAutoSuccessWithConfig } from './assert-payment-env';

// #region agent log
function agentDebugLog(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string,
): void {
  try {
    appendFileSync(
      '/home/azem/projects/Pastane/.cursor/debug-af6185.log',
      `${JSON.stringify({
        sessionId: 'af6185',
        timestamp: Date.now(),
        location,
        message,
        data,
        hypothesisId,
        runId: process.env.DEBUG_RUN_ID ?? 'pre-fix',
      })}\n`,
    );
  } catch {
    /* local debug log only */
  }
}
// #endregion

@Injectable()
export class PaymentsService implements OnModuleInit {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @Inject(ConfigService) private readonly config: ConfigService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(OrderStatusService) private readonly statuses: OrderStatusService,
    @Inject(IyzicoProvider) private readonly provider: IyzicoProvider,
    @Inject(QueuesService) private readonly queues: QueuesService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
  ) {}

  onModuleInit(): void {
    assertForbiddenPaymentDevAutoSuccessWithConfig(this.config);
  }

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

  private async supersedePendingPayment(paymentId: string, reason: string): Promise<void> {
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.FAILED,
        failureReason: reason,
        processedAt: new Date(),
        processingResult: 'SUPERSEDED',
      },
    });
  }

  /** Eski / eksik bekleyen ödemeleri temizler; aktif checkout formu varsa yeniden kullanılabilir. */
  private async reconcilePendingPaymentsForCheckout(
    orderId: string,
    idempotencyKey: string,
  ): Promise<{ checkoutFormContent: string; conversationId: string; providerToken: string | null } | null> {
    const pending = await this.prisma.payment.findMany({
      where: { orderId, status: PaymentStatus.PENDING },
      orderBy: { createdAt: 'desc' },
    });

    let reusable: { checkoutFormContent: string; conversationId: string; providerToken: string | null } | null = null;

    for (const payment of pending) {
      if (payment.idempotencyKey === idempotencyKey) continue;

      const form = extractCheckoutFormContent(payment.responsePayload);
      if (!form) {
        await this.supersedePendingPayment(payment.id, 'Yeni ödeme oturumu ile değiştirildi');
        continue;
      }

      if (!reusable) {
        reusable = {
          checkoutFormContent: form,
          conversationId: payment.conversationId ?? randomUUID(),
          providerToken: payment.providerToken,
        };
      }
    }

    return reusable;
  }

  private assertOrderItemsPurchasable(
    order: Order & { items?: Array<{ product: Parameters<typeof computeProductAvailability>[0] | null; productNameSnapshot: string }> },
  ): void {
    const unavailableItems = (order.items ?? []).filter((item) => !item.product || !computeProductAvailability(item.product).isPurchasable);
    if (!unavailableItems.length) return;
    throw new AppException(
      ERROR_CODES.PRODUCT_NOT_AVAILABLE_FOR_SALE,
      'Order contains products not available for sale',
      HttpStatus.CONFLICT,
      {
        unavailableItems: unavailableItems.map((item) => ({
          productName: item.productNameSnapshot,
          reason: item.product ? computeProductAvailability(item.product).availabilityReason : 'INACTIVE',
        })),
      },
    );
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
      const registrationAddress = sanitizeIyzicoText(full, 256);
      const addr = {
        contactName: sanitizeIyzicoText(contactName, 64),
        city: sanitizeIyzicoText(city, 64),
        country,
        address: registrationAddress,
        zipCode: '34000',
      };
      return {
        buyer: { ...buyerBase, registrationAddress, city, country },
        shippingAddress: addr,
        billingAddress: addr,
      };
    }

    const store = order.pickupStore;
    if (!store) throw new AppException(ERROR_CODES.ORDER_NOT_FOUND, 'Pickup store missing for order', HttpStatus.BAD_REQUEST);
    const full = sanitizeIyzicoText(`${store.name} - ${store.address}, ${store.district} ${store.city}`, 256);
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
    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, userId, deletedAt: null },
      include: { items: { include: { product: true } } },
    });
    if (!order || order.status !== OrderStatus.PAYMENT_PENDING) {
      throw new AppException(ERROR_CODES.ORDER_NOT_FOUND, 'Order not payable', HttpStatus.BAD_REQUEST);
    }
    this.assertOrderItemsPurchasable(order);
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
    // Mobil ve web aynı iyzico sandbox hesabını kullanır; tek SDK istemcisi tutarlılık sağlar.
    const iyzicoChannel = 'web' as const;
    const clientSurface = idempotencyKey.includes('iyzico-mobile') ? 'mobile' : 'web';
    // #region agent log
    agentDebugLog(
      'payments.service.ts:initiateCheckoutForm',
      'checkout init entry',
      { orderId, channel: iyzicoChannel, clientSurface, idempotencySuffix: idempotencyKey.slice(-24) },
      'H1',
    );
    // #endregion
    this.provider.assertCheckoutConfigured(iyzicoChannel);
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId, deletedAt: null },
      include: { user: true, pickupStore: true, items: { include: { product: { include: { category: true } } } } },
    });
    if (!order || order.status !== OrderStatus.PAYMENT_PENDING) {
      throw new AppException(ERROR_CODES.ORDER_NOT_FOUND, 'Order not payable', HttpStatus.BAD_REQUEST);
    }
    this.assertOrderItemsPurchasable(order);

    const existing = await this.prisma.payment.findUnique({ where: { idempotencyKey } });
    if (existing) {
      const cached = extractCheckoutFormContent(existing.responsePayload);
      if (cached) return { checkoutFormContent: cached };
      await this.supersedePendingPayment(existing.id, 'Eksik iyzico formu; yeni oturum başlatıldı');
      this.logger.warn(
        `checkout-form-init superseded stale payment orderId=${orderId} idempotency=${idempotencyKey.slice(-24)}`,
      );
    }

    const reusableSession = await this.reconcilePendingPaymentsForCheckout(order.id, idempotencyKey);
    if (reusableSession) {
      // #region agent log
      agentDebugLog(
        'payments.service.ts:initiateCheckoutForm',
        'reusing existing checkout form (no duplicate payment row)',
        { orderId, idempotencySuffix: idempotencyKey.slice(-24) },
        'H1',
      );
      // #endregion
      return { checkoutFormContent: reusableSession.checkoutFormContent };
    }

    const { buyer, shippingAddress, billingAddress } = this.buildIyzicoBuyerAndAddresses(order);
    const conversationId = randomUUID();
    const sdkRequest = buildIyzicoCheckoutSdkRequest({
      order,
      conversationId,
      callbackUrl: this.checkoutFormCallbackUrl(),
      buyer,
      shippingAddress,
      billingAddress,
    });

    let sdkResult;
    try {
      sdkResult = await this.provider.checkoutFormInitialize(sdkRequest, iyzicoChannel);
    } catch (err) {
      const detail = err instanceof Error ? err.message : undefined;
      // #region agent log
      agentDebugLog(
        'payments.service.ts:initiateCheckoutForm',
        'iyzico sdk init threw',
        { orderId, channel: iyzicoChannel, clientSurface, detail: detail?.slice(0, 120) },
        'H3',
      );
      // #endregion
      const friendly = friendlyIyzicoInitError(detail ?? 'iyzico bağlantı hatası');
      this.logger.warn(`checkout-form-init iyzico threw orderId=${orderId} client=${clientSurface} detail=${detail ?? 'n/a'}`);
      throw new AppException(ERROR_CODES.VALIDATION_FAILED, friendly, HttpStatus.BAD_GATEWAY);
    }

    if (sdkResult.status !== 'success' || !sdkResult.token || !sdkResult.checkoutFormContent) {
      const raw =
        typeof sdkResult.errorMessage === 'string'
          ? sdkResult.errorMessage
          : typeof sdkResult.errorCode === 'string'
            ? sdkResult.errorCode
            : undefined;
      const friendly = friendlyIyzicoInitError(raw);
      // #region agent log
      agentDebugLog(
        'payments.service.ts:initiateCheckoutForm',
        'iyzico sdk rejected init',
        { orderId, channel: iyzicoChannel, clientSurface, raw: raw?.slice(0, 120), friendly: friendly.slice(0, 120) },
        'H3',
      );
      // #endregion
      this.logger.warn(
        `checkout-form-init rejected orderId=${orderId} client=${clientSurface} raw=${raw ?? 'n/a'}`,
      );
      throw new AppException(ERROR_CODES.VALIDATION_FAILED, friendly, HttpStatus.BAD_REQUEST);
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

    // #region agent log
    agentDebugLog(
      'payments.service.ts:initiateCheckoutForm',
      'checkout form created',
      { orderId, channel: iyzicoChannel, htmlLength: sdkResult.checkoutFormContent.length },
      'H4',
    );
    // #endregion
    this.logger.log(`checkout-form-init ok orderId=${orderId} channel=${iyzicoChannel}`);

    return { checkoutFormContent: sdkResult.checkoutFormContent };
  }

  async finalizeCheckoutFormReturnRedirectUrl(token: string | undefined): Promise<string> {
    const web = this.getStorefrontBaseUrl();

    const failWeb = (orderId?: string) =>
      orderId
        ? `${web}/odeme?durum=basarisiz&orderId=${encodeURIComponent(orderId)}`
        : `${web}/odeme?durum=basarisiz`;

    if (!token?.length) return failWeb();

    const pay0 = await this.prisma.payment.findFirst({ where: { providerToken: token } });
    if (!pay0) return failWeb();

    const mobScheme = (this.config.get<string>('MOBILE_PAYMENT_SCHEME') ?? process.env.MOBILE_PAYMENT_SCHEME ?? 'pastahane').replace(/\/$/, '');
    const isMobileCheckout = pay0.idempotencyKey.includes('iyzico-mobile');
    const mobileResult = (orderId: string, outcome: 'success' | 'failure'): string =>
      `${mobScheme}://payment-result?${new URLSearchParams({ orderId, status: outcome }).toString()}`;
    const failRedirect = (orderId?: string) =>
      isMobileCheckout ? mobileResult(orderId ?? pay0.orderId, 'failure') : failWeb(orderId);
    const successListRedirect = () => (isMobileCheckout ? mobileResult(pay0.orderId, 'success') : `${web}/siparisler`);

    if (pay0.status === PaymentStatus.SUCCESS) {
      return successListRedirect();
    }
    if (pay0.status !== PaymentStatus.PENDING) return failRedirect(pay0.orderId);
    if (!pay0.conversationId) return failRedirect(pay0.orderId);

    let retrieve: CheckoutFormRetrieveSdkResult;
    try {
      retrieve = await this.provider.checkoutFormRetrieve(
        {
          locale: 'tr',
          token,
          conversationId: pay0.conversationId,
        },
        isMobileCheckout ? 'mobile' : 'web',
      );
    } catch {
      return failRedirect(pay0.orderId);
    }

    if (retrieve.conversationId && retrieve.conversationId !== pay0.conversationId) {
      return failRedirect(pay0.orderId);
    }

    const paymentSuccess = retrieve.status === 'success' && retrieve.paymentStatus === 'SUCCESS';
    const dtoStatus = paymentSuccess ? ('SUCCESS' as const) : ('FAILED' as const);

    const raw = retrieve as unknown as Record<string, unknown>;
    if (!this.provider.verifyCallback(raw)) return failRedirect(pay0.orderId);

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
      return successListRedirect();
    }
    return failRedirect(pay0.orderId);
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
