"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
const audit_service_1 = require("../audit/audit.service");
const app_exception_1 = require("../common/exceptions/app.exception");
const error_codes_1 = require("../common/constants/error-codes");
const money_util_1 = require("../common/utils/money.util");
const prisma_service_1 = require("../database/prisma.service");
const queues_service_1 = require("../jobs/queues.service");
const notifications_service_1 = require("../notifications/notifications.service");
const order_status_service_1 = require("../orders/order-status.service");
const iyzico_provider_1 = require("./providers/iyzico.provider");
let PaymentsService = class PaymentsService {
    config;
    prisma;
    statuses;
    provider;
    queues;
    audit;
    notifications;
    constructor(config, prisma, statuses, provider, queues, audit, notifications) {
        this.config = config;
        this.prisma = prisma;
        this.statuses = statuses;
        this.provider = provider;
        this.queues = queues;
        this.audit = audit;
        this.notifications = notifications;
    }
    isPaymentDevAutoSuccessEnabled() {
        if (process.env.NODE_ENV === 'production')
            return false;
        const raw = process.env.PAYMENT_DEV_AUTO_SUCCESS ?? this.config.get('PAYMENT_DEV_AUTO_SUCCESS');
        return raw === 'true';
    }
    getPublicApiBaseUrl() {
        const base = this.config.get('PUBLIC_API_URL') ?? this.config.get('API_URL') ?? process.env.PUBLIC_API_URL ?? process.env.API_URL ?? 'http://localhost:3003';
        return base.replace(/\/$/, '');
    }
    getStorefrontBaseUrl() {
        const base = this.config.get('WEB_URL') ?? process.env.WEB_URL ?? 'http://localhost:3000';
        return base.replace(/\/$/, '');
    }
    checkoutFormCallbackUrl() {
        return `${this.getPublicApiBaseUrl()}/api/v1/payments/iyzico/form-return`;
    }
    async assertNoOtherPendingPayment(orderId, idempotencyKey) {
        const other = await this.prisma.payment.findFirst({
            where: { orderId, status: client_1.PaymentStatus.PENDING, NOT: { idempotencyKey } },
        });
        if (other) {
            throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.PAYMENT_ALREADY_COMPLETED, 'Bu sipariş için ödeme zaten başlatıldı. Mevcut ödemeyi tamamlayın veya süresinin dolmasını bekleyin.', common_1.HttpStatus.CONFLICT);
        }
    }
    formatBuyerGsm(phone) {
        const digits = phone.replace(/\D/g, '');
        if (digits.startsWith('90') && digits.length >= 12)
            return `+${digits}`;
        if (digits.length === 10)
            return `+90${digits}`;
        if (digits.length === 11 && digits.startsWith('0'))
            return `+9${digits}`;
        return digits.length ? `+${digits}` : '+905551234567';
    }
    buildIyzicoBuyerAndAddresses(order) {
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
        if (order.deliveryType === client_1.DeliveryType.HOME_DELIVERY) {
            const snap = (order.addressSnapshot ?? null);
            const city = typeof snap?.city === 'string' ? snap.city : 'Istanbul';
            const district = typeof snap?.district === 'string' ? snap.district : '';
            const full = typeof snap?.fullAddress === 'string'
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
        if (!store)
            throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.ORDER_NOT_FOUND, 'Pickup store missing for order', common_1.HttpStatus.BAD_REQUEST);
        const full = `${store.name} — ${store.address}, ${store.district} ${store.city}`;
        const addr = { contactName, city: store.city, country, address: full, zipCode: '34000' };
        return {
            buyer: { ...buyerBase, registrationAddress: full, city: store.city, country },
            shippingAddress: addr,
            billingAddress: addr,
        };
    }
    async applySuccessfulPaymentInTx(tx, args) {
        const { payment, order, reservations, now, providerStatus, auditAction, processingResult } = args;
        for (const reservation of reservations) {
            await tx.stockEntry.update({ where: { id: reservation.stockEntryId }, data: { quantity: { decrement: reservation.quantity } } });
        }
        await tx.stockReservation.updateMany({
            where: { orderId: order.id, status: client_1.StockReservationStatus.ACTIVE },
            data: { status: client_1.StockReservationStatus.CONFIRMED, confirmedAt: now },
        });
        if (order.status !== client_1.OrderStatus.PAYMENT_PENDING) {
            throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.ORDER_STATUS_TRANSITION_INVALID, 'Order is not in payment pending state', common_1.HttpStatus.BAD_REQUEST);
        }
        await tx.order.update({ where: { id: order.id }, data: { status: client_1.OrderStatus.CONFIRMED } });
        await tx.orderStatusHistory.create({ data: { orderId: order.id, status: client_1.OrderStatus.CONFIRMED } });
        if (order.loyaltyPointsUsed > 0) {
            const account = await tx.loyaltyAccount.findUnique({ where: { userId: order.userId } });
            if (!account || account.points < order.loyaltyPointsUsed) {
                throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.INSUFFICIENT_LOYALTY_POINTS, 'Insufficient loyalty points', common_1.HttpStatus.CONFLICT);
            }
            const updated = await tx.loyaltyAccount.update({ where: { id: account.id }, data: { points: { decrement: order.loyaltyPointsUsed } } });
            await tx.loyaltyMovement.create({
                data: { loyaltyAccountId: account.id, type: 'REDEEM', points: -order.loyaltyPointsUsed, balanceAfter: updated.points, note: `Order ${order.orderNumber}` },
            });
        }
        await this.audit.log({ actorId: null, action: auditAction, entityType: 'Payment', entityId: payment.id, newValues: { status: client_1.PaymentStatus.SUCCESS, providerStatus } }, tx);
        await this.notifications.createOrderStatusNotification(tx, order.userId, order.orderNumber, client_1.OrderStatus.CONFIRMED);
        return tx.payment.update({
            where: { id: payment.id },
            data: { status: client_1.PaymentStatus.SUCCESS, providerStatus, processedAt: now, processingResult },
        });
    }
    async initiate(userId, dto, idempotencyKey) {
        const order = await this.prisma.order.findFirst({ where: { id: dto.orderId, userId, deletedAt: null } });
        if (!order || order.status !== client_1.OrderStatus.PAYMENT_PENDING) {
            throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.ORDER_NOT_FOUND, 'Order not payable', common_1.HttpStatus.BAD_REQUEST);
        }
        const existing = await this.prisma.payment.findUnique({ where: { idempotencyKey } });
        if (existing)
            return existing;
        await this.assertNoOtherPendingPayment(order.id, idempotencyKey);
        const reservations = await this.prisma.stockReservation.findMany({
            where: { orderId: order.id, status: client_1.StockReservationStatus.ACTIVE, expiresAt: { gt: new Date() } },
        });
        if (!reservations.length)
            throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.STOCK_RESERVATION_EXPIRED, 'Reservation expired', common_1.HttpStatus.BAD_REQUEST);
        const providerResponse = await this.provider.initiate(dto, (0, crypto_1.randomUUID)());
        if (this.isPaymentDevAutoSuccessEnabled()) {
            return this.prisma.$transaction(async (tx) => {
                const payment = await tx.payment.create({
                    data: {
                        orderId: order.id, idempotencyKey, providerPaymentId: providerResponse.providerPaymentId,
                        conversationId: providerResponse.conversationId, providerToken: providerResponse.redirectUrl, amount: order.grandTotal,
                    },
                });
                const o = await tx.order.findUniqueOrThrow({ where: { id: payment.orderId } });
                if (money_util_1.money.compare(payment.amount, o.grandTotal) !== 0) {
                    throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.PAYMENT_AMOUNT_MISMATCH, 'Amount mismatch', common_1.HttpStatus.CONFLICT);
                }
                const now = new Date();
                const res = await tx.stockReservation.findMany({ where: { orderId: o.id, status: client_1.StockReservationStatus.ACTIVE } });
                if (o.status !== client_1.OrderStatus.PAYMENT_PENDING || !res.length || res.some((r) => r.expiresAt <= now)) {
                    throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.STOCK_RESERVATION_EXPIRED, 'Reservation inactive or expired', common_1.HttpStatus.BAD_REQUEST);
                }
                return this.applySuccessfulPaymentInTx(tx, {
                    payment,
                    order: o,
                    reservations: res,
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
    async callback(dto, raw) {
        if (!this.provider.verifyCallback(raw))
            throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.PAYMENT_CALLBACK_INVALID, 'Invalid callback', common_1.HttpStatus.BAD_REQUEST);
        const safePayload = this.provider.sanitize(raw);
        const payloadHash = (0, crypto_1.createHash)('sha256').update(JSON.stringify(safePayload)).digest('hex');
        const now = new Date();
        return this.prisma.$transaction(async (tx) => {
            const payment = await tx.payment.findFirst({ where: { conversationId: dto.conversationId, providerPaymentId: dto.providerPaymentId } });
            if (!payment)
                throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.PAYMENT_NOT_FOUND, 'Payment not found', common_1.HttpStatus.NOT_FOUND);
            const lock = await tx.payment.updateMany({
                where: { id: payment.id, status: client_1.PaymentStatus.PENDING },
                data: { receivedAt: now, providerStatus: dto.status, callbackPayloadHash: payloadHash, processingResult: 'PROCESSING' },
            });
            if (lock.count === 0)
                return tx.payment.findUniqueOrThrow({ where: { id: payment.id } });
            const order = await tx.order.findUniqueOrThrow({ where: { id: payment.orderId } });
            if (money_util_1.money.compare(payment.amount, order.grandTotal) !== 0) {
                return tx.payment.update({
                    where: { id: payment.id },
                    data: { status: client_1.PaymentStatus.FAILED, processedAt: now, processingResult: 'AMOUNT_MISMATCH', failureReason: 'Amount mismatch' },
                });
            }
            const reservations = await tx.stockReservation.findMany({ where: { orderId: order.id, status: client_1.StockReservationStatus.ACTIVE } });
            if (order.status !== client_1.OrderStatus.PAYMENT_PENDING || !reservations.length || reservations.some((reservation) => reservation.expiresAt <= now)) {
                return tx.payment.update({
                    where: { id: payment.id },
                    data: { status: client_1.PaymentStatus.FAILED, processedAt: now, processingResult: 'RESERVATION_INVALID', failureReason: 'Reservation inactive or expired' },
                });
            }
            if (dto.status === 'FAILED') {
                await tx.stockReservation.updateMany({
                    where: { orderId: order.id, status: client_1.StockReservationStatus.ACTIVE },
                    data: { status: client_1.StockReservationStatus.RELEASED, releasedAt: now },
                });
                this.statuses.assert(order.status, client_1.OrderStatus.CANCELLED);
                await tx.order.update({ where: { id: order.id }, data: { status: client_1.OrderStatus.CANCELLED } });
                await tx.orderStatusHistory.create({ data: { orderId: order.id, status: client_1.OrderStatus.CANCELLED } });
                await this.audit.log({ actorId: null, action: 'payment.callback.failed', entityType: 'Payment', entityId: payment.id, newValues: { status: client_1.PaymentStatus.FAILED, providerStatus: dto.status } }, tx);
                await this.notifications.createOrderStatusNotification(tx, order.userId, order.orderNumber, client_1.OrderStatus.CANCELLED);
                return tx.payment.update({
                    where: { id: payment.id },
                    data: { status: client_1.PaymentStatus.FAILED, providerStatus: dto.status, processedAt: now, processingResult: 'FAILED' },
                });
            }
            return this.applySuccessfulPaymentInTx(tx, {
                payment,
                order,
                reservations,
                now,
                providerStatus: dto.status,
                auditAction: 'payment.callback.success',
                processingResult: 'SUCCESS',
            });
        });
    }
    async initiateCheckoutForm(userId, orderId, idempotencyKey) {
        this.provider.assertCheckoutConfigured();
        const order = await this.prisma.order.findFirst({
            where: { id: orderId, userId, deletedAt: null },
            include: { user: true, pickupStore: true, items: { include: { product: { include: { category: true } } } } },
        });
        if (!order || order.status !== client_1.OrderStatus.PAYMENT_PENDING) {
            throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.ORDER_NOT_FOUND, 'Order not payable', common_1.HttpStatus.BAD_REQUEST);
        }
        const existing = await this.prisma.payment.findUnique({ where: { idempotencyKey } });
        if (existing) {
            const payload = existing.responsePayload;
            if (payload && typeof payload.checkoutFormContent === 'string') {
                return { checkoutFormContent: payload.checkoutFormContent };
            }
            throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.PAYMENT_ALREADY_COMPLETED, 'Bu iyzico ödeme oturumu zaten oluşturuldu; sayfayı yenileyin veya farklı bir ödeme yöntemi deneyin.', common_1.HttpStatus.CONFLICT);
        }
        await this.assertNoOtherPendingPayment(order.id, idempotencyKey);
        const reservations = await this.prisma.stockReservation.findMany({
            where: { orderId: order.id, status: client_1.StockReservationStatus.ACTIVE, expiresAt: { gt: new Date() } },
        });
        if (!reservations.length)
            throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.STOCK_RESERVATION_EXPIRED, 'Reservation expired', common_1.HttpStatus.BAD_REQUEST);
        const { buyer, shippingAddress, billingAddress } = this.buildIyzicoBuyerAndAddresses(order);
        const grandStr = money_util_1.money.round(order.grandTotal).toFixed(2);
        const basketItems = order.items.length > 0
            ? order.items.map((item) => {
                const line = money_util_1.money.multiply(item.unitPriceSnapshot, item.quantity);
                const cat = item.product?.category?.name ?? 'Pastane';
                return {
                    id: item.id,
                    name: item.productNameSnapshot,
                    category1: cat,
                    itemType: 'PHYSICAL',
                    price: money_util_1.money.round(line).toFixed(2),
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
        let sum = money_util_1.money.of(0);
        for (const b of basketItems) {
            sum = money_util_1.money.add(sum, b.price);
        }
        if (money_util_1.money.compare(money_util_1.money.round(sum), money_util_1.money.round(order.grandTotal)) !== 0) {
            basketItems.length = 0;
            basketItems.push({
                id: order.id,
                name: `Sipariş ${order.orderNumber}`,
                category1: 'Pastane',
                itemType: 'PHYSICAL',
                price: grandStr,
            });
        }
        const conversationId = (0, crypto_1.randomUUID)();
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
        }
        catch {
            throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.INTERNAL_SERVER_ERROR, 'iyzico bağlantı hatası', common_1.HttpStatus.BAD_GATEWAY);
        }
        if (sdkResult.status !== 'success' || !sdkResult.token || !sdkResult.checkoutFormContent) {
            throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.VALIDATION_FAILED, typeof sdkResult.errorMessage === 'string' ? sdkResult.errorMessage : 'Ödeme formu başlatılamadı', common_1.HttpStatus.BAD_REQUEST);
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
                },
            },
        });
        await this.queues.schedulePaymentTimeout(payment.id);
        return { checkoutFormContent: sdkResult.checkoutFormContent };
    }
    async finalizeCheckoutFormReturnRedirectUrl(token) {
        const web = this.getStorefrontBaseUrl();
        const failUrl = (orderId) => orderId
            ? `${web}/odeme?durum=basarisiz&orderId=${encodeURIComponent(orderId)}`
            : `${web}/odeme?durum=basarisiz`;
        if (!token?.length)
            return failUrl();
        const pay0 = await this.prisma.payment.findFirst({ where: { providerToken: token } });
        if (!pay0)
            return failUrl();
        if (pay0.status === client_1.PaymentStatus.SUCCESS) {
            return `${web}/siparisler`;
        }
        if (pay0.status !== client_1.PaymentStatus.PENDING)
            return failUrl(pay0.orderId);
        if (!pay0.conversationId)
            return failUrl(pay0.orderId);
        let retrieve;
        try {
            retrieve = await this.provider.checkoutFormRetrieve({
                locale: 'tr',
                token,
                conversationId: pay0.conversationId,
            });
        }
        catch {
            return failUrl(pay0.orderId);
        }
        if (retrieve.conversationId && retrieve.conversationId !== pay0.conversationId) {
            return failUrl(pay0.orderId);
        }
        const paymentSuccess = retrieve.status === 'success' && retrieve.paymentStatus === 'SUCCESS';
        const dtoStatus = paymentSuccess ? 'SUCCESS' : 'FAILED';
        const raw = retrieve;
        if (!this.provider.verifyCallback(raw))
            return failUrl(pay0.orderId);
        const safePayload = this.provider.sanitize(raw);
        const payloadHash = (0, crypto_1.createHash)('sha256').update(JSON.stringify(safePayload)).digest('hex');
        const now = new Date();
        const lockData = {
            receivedAt: now,
            providerStatus: dtoStatus,
            callbackPayloadHash: payloadHash,
            processingResult: 'PROCESSING',
            responsePayload: retrieve,
        };
        if (typeof retrieve.paymentId === 'string' && retrieve.paymentId.length > 0) {
            lockData.providerPaymentId = retrieve.paymentId;
        }
        await this.prisma.$transaction(async (tx) => {
            const payment = await tx.payment.findFirst({ where: { id: pay0.id } });
            if (!payment || payment.status !== client_1.PaymentStatus.PENDING)
                return;
            const lock = await tx.payment.updateMany({
                where: { id: payment.id, status: client_1.PaymentStatus.PENDING },
                data: lockData,
            });
            if (lock.count === 0)
                return;
            const order = await tx.order.findUniqueOrThrow({ where: { id: payment.orderId } });
            if (money_util_1.money.compare(payment.amount, order.grandTotal) !== 0) {
                await tx.payment.update({
                    where: { id: payment.id },
                    data: { status: client_1.PaymentStatus.FAILED, processedAt: now, processingResult: 'AMOUNT_MISMATCH', failureReason: 'Amount mismatch' },
                });
                return;
            }
            const reservations = await tx.stockReservation.findMany({ where: { orderId: order.id, status: client_1.StockReservationStatus.ACTIVE } });
            if (order.status !== client_1.OrderStatus.PAYMENT_PENDING || !reservations.length || reservations.some((reservation) => reservation.expiresAt <= now)) {
                await tx.payment.update({
                    where: { id: payment.id },
                    data: { status: client_1.PaymentStatus.FAILED, processedAt: now, processingResult: 'RESERVATION_INVALID', failureReason: 'Reservation inactive or expired' },
                });
                return;
            }
            if (dtoStatus === 'FAILED') {
                await tx.stockReservation.updateMany({
                    where: { orderId: order.id, status: client_1.StockReservationStatus.ACTIVE },
                    data: { status: client_1.StockReservationStatus.RELEASED, releasedAt: now },
                });
                this.statuses.assert(order.status, client_1.OrderStatus.CANCELLED);
                await tx.order.update({ where: { id: order.id }, data: { status: client_1.OrderStatus.CANCELLED } });
                await tx.orderStatusHistory.create({ data: { orderId: order.id, status: client_1.OrderStatus.CANCELLED } });
                await this.audit.log({ actorId: null, action: 'payment.iyzico.checkout.failed', entityType: 'Payment', entityId: payment.id, newValues: { status: client_1.PaymentStatus.FAILED, providerStatus: dtoStatus } }, tx);
                await this.notifications.createOrderStatusNotification(tx, order.userId, order.orderNumber, client_1.OrderStatus.CANCELLED);
                await tx.payment.update({
                    where: { id: payment.id },
                    data: { status: client_1.PaymentStatus.FAILED, providerStatus: dtoStatus, processedAt: now, processingResult: 'FAILED' },
                });
                return;
            }
            await this.applySuccessfulPaymentInTx(tx, {
                payment,
                order,
                reservations,
                now,
                providerStatus: retrieve.paymentStatus ?? dtoStatus,
                auditAction: 'payment.iyzico.checkout.success',
                processingResult: 'SUCCESS',
            });
        });
        const refreshed = await this.prisma.payment.findFirst({ where: { id: pay0.id } });
        if (refreshed?.status === client_1.PaymentStatus.SUCCESS) {
            return `${web}/siparisler`;
        }
        return failUrl(pay0.orderId);
    }
    async findOwn(userId, orderId) {
        const order = await this.prisma.order.findFirst({ where: { id: orderId, userId, deletedAt: null } });
        if (!order)
            throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.ORDER_NOT_FOUND, 'Order not found', common_1.HttpStatus.NOT_FOUND);
        return this.prisma.payment.findMany({ where: { orderId }, orderBy: { createdAt: 'desc' } });
    }
    async timeout(paymentId) {
        return this.prisma.$transaction(async (tx) => {
            const payment = await tx.payment.findUnique({ where: { id: paymentId } });
            if (!payment || payment.status !== client_1.PaymentStatus.PENDING)
                return null;
            const order = await tx.order.findUniqueOrThrow({ where: { id: payment.orderId } });
            if (order.status !== client_1.OrderStatus.PAYMENT_PENDING)
                return payment;
            await tx.stockReservation.updateMany({
                where: { orderId: order.id, status: client_1.StockReservationStatus.ACTIVE },
                data: { status: client_1.StockReservationStatus.EXPIRED, releasedAt: new Date() },
            });
            await tx.order.update({ where: { id: order.id }, data: { status: client_1.OrderStatus.CANCELLED } });
            await tx.orderStatusHistory.create({ data: { orderId: order.id, status: client_1.OrderStatus.CANCELLED } });
            await this.audit.log({ actorId: null, action: 'payment.timeout', entityType: 'Payment', entityId: payment.id, newValues: { status: client_1.PaymentStatus.TIMEOUT } }, tx);
            await this.notifications.createOrderStatusNotification(tx, order.userId, order.orderNumber, client_1.OrderStatus.CANCELLED);
            return tx.payment.update({ where: { id: payment.id }, data: { status: client_1.PaymentStatus.TIMEOUT, processedAt: new Date(), processingResult: 'TIMEOUT' } });
        });
    }
    async expireReservation(orderId) {
        return this.prisma.$transaction(async (tx) => {
            const active = await tx.stockReservation.count({ where: { orderId, status: client_1.StockReservationStatus.ACTIVE, expiresAt: { lte: new Date() } } });
            if (!active)
                return null;
            await tx.stockReservation.updateMany({
                where: { orderId, status: client_1.StockReservationStatus.ACTIVE },
                data: { status: client_1.StockReservationStatus.EXPIRED, releasedAt: new Date() },
            });
            const order = await tx.order.findUnique({ where: { id: orderId } });
            if (order?.status === client_1.OrderStatus.PAYMENT_PENDING) {
                await tx.order.update({ where: { id: orderId }, data: { status: client_1.OrderStatus.CANCELLED } });
                await tx.orderStatusHistory.create({ data: { orderId, status: client_1.OrderStatus.CANCELLED } });
            }
            return true;
        });
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(config_1.ConfigService)),
    __param(1, (0, common_1.Inject)(prisma_service_1.PrismaService)),
    __param(2, (0, common_1.Inject)(order_status_service_1.OrderStatusService)),
    __param(3, (0, common_1.Inject)(iyzico_provider_1.IyzicoProvider)),
    __param(4, (0, common_1.Inject)(queues_service_1.QueuesService)),
    __param(5, (0, common_1.Inject)(audit_service_1.AuditService)),
    __param(6, (0, common_1.Inject)(notifications_service_1.NotificationsService)),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService,
        order_status_service_1.OrderStatusService,
        iyzico_provider_1.IyzicoProvider,
        queues_service_1.QueuesService,
        audit_service_1.AuditService,
        notifications_service_1.NotificationsService])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map