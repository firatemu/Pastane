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
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const app_exception_1 = require("../common/exceptions/app.exception");
const error_codes_1 = require("../common/constants/error-codes");
const money_util_1 = require("../common/utils/money.util");
const order_number_util_1 = require("../common/utils/order-number.util");
const pagination_util_1 = require("../common/utils/pagination.util");
const audit_service_1 = require("../audit/audit.service");
const prisma_service_1 = require("../database/prisma.service");
const loyalty_service_1 = require("../loyalty/loyalty.service");
const notifications_service_1 = require("../notifications/notifications.service");
const queues_service_1 = require("../jobs/queues.service");
const stock_reservations_service_1 = require("../stock-reservations/stock-reservations.service");
const order_status_service_1 = require("./order-status.service");
let OrdersService = class OrdersService {
    prisma;
    reservations;
    statuses;
    queues;
    audit;
    loyalty;
    notifications;
    constructor(prisma, reservations, statuses, queues, audit, loyalty, notifications) {
        this.prisma = prisma;
        this.reservations = reservations;
        this.statuses = statuses;
        this.queues = queues;
        this.audit = audit;
        this.loyalty = loyalty;
        this.notifications = notifications;
    }
    async create(userId, dto) {
        const created = await this.prisma.$transaction(async (tx) => {
            const cart = await tx.cart.findUnique({ where: { userId }, include: { items: { include: { product: true, options: { include: { option: true } } } } } });
            if (!cart?.items.length)
                throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.CART_EMPTY, 'Cart is empty', common_1.HttpStatus.BAD_REQUEST);
            let addressSnapshot;
            let deliveryFee = money_util_1.money.of(0);
            if (dto.deliveryType === client_1.DeliveryType.HOME_DELIVERY) {
                if (!dto.addressId)
                    throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.ORDER_ADDRESS_REQUIRED, 'Address required', common_1.HttpStatus.BAD_REQUEST);
                const a = await tx.address.findFirst({ where: { id: dto.addressId, userId, deletedAt: null } });
                if (!a)
                    throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.ORDER_ADDRESS_REQUIRED, 'Address required', common_1.HttpStatus.BAD_REQUEST);
                const zone = await tx.deliveryZone.findFirst({ where: { name: { equals: a.district, mode: 'insensitive' }, deletedAt: null, isActive: true } });
                if (!zone)
                    throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.DELIVERY_ZONE_NOT_FOUND, 'Delivery zone not found for address', common_1.HttpStatus.BAD_REQUEST);
                addressSnapshot = Object.assign({ title: a.title, city: a.city, district: a.district, neighborhood: a.neighborhood, fullAddress: a.fullAddress, building: a.building, floor: a.floor, apartment: a.apartment, directions: a.directions }, typeof a.latitude === 'number' && Number.isFinite(a.latitude) && typeof a.longitude === 'number' && Number.isFinite(a.longitude) ? { latitude: a.latitude, longitude: a.longitude } : {}, typeof a.mapAddress === 'string' && a.mapAddress.trim().length ? { mapAddress: a.mapAddress.trim() } : {});
                deliveryFee = zone.deliveryFee;
            }
            if (dto.deliveryType === client_1.DeliveryType.PICKUP) {
                if (!dto.pickupStoreId)
                    throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.ORDER_PICKUP_STORE_REQUIRED, 'Pickup store required', common_1.HttpStatus.BAD_REQUEST);
                const s = await tx.store.findFirst({ where: { id: dto.pickupStoreId, deletedAt: null, isActive: true } });
                if (!s)
                    throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.ORDER_PICKUP_STORE_REQUIRED, 'Pickup store required', common_1.HttpStatus.BAD_REQUEST);
            }
            const account = await tx.loyaltyAccount.findUnique({ where: { userId } });
            if ((dto.loyaltyPointsUsed ?? 0) > (account?.points ?? 0))
                throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.INSUFFICIENT_LOYALTY_POINTS, 'Insufficient loyalty points', common_1.HttpStatus.BAD_REQUEST);
            const priced = cart.items.map(i => { const optionTotal = money_util_1.money.add(...i.options.map(({ option }) => option.priceModifier)); const unit = money_util_1.money.add(i.product.discountedPrice ?? i.product.price, optionTotal); return { cartItem: i, unit, total: money_util_1.money.multiply(unit, i.quantity) }; });
            const subtotal = money_util_1.money.round(money_util_1.money.add(...priced.map(i => i.total)));
            const setting = await tx.loyaltySetting.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
            const loyaltyDiscount = setting && dto.loyaltyPointsUsed ? money_util_1.money.round(money_util_1.money.multiply(setting.pointValue, dto.loyaltyPointsUsed)) : money_util_1.money.of(0);
            const grandTotal = money_util_1.money.round(money_util_1.money.subtract(money_util_1.money.add(subtotal, deliveryFee), loyaltyDiscount));
            const orderNumber = await this.nextOrderNumber(tx);
            const order = await tx.order.create({ data: { orderNumber, userId, deliveryType: dto.deliveryType, addressSnapshot, pickupStoreId: dto.pickupStoreId, scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined, subtotal, deliveryFee, loyaltyDiscount, loyaltyPointsUsed: dto.loyaltyPointsUsed ?? 0, grandTotal, note: dto.note, status: client_1.OrderStatus.PAYMENT_PENDING } });
            const reservationItems = [];
            for (const item of priced) {
                const oi = await tx.orderItem.create({ data: { orderId: order.id, productId: item.cartItem.productId, productNameSnapshot: item.cartItem.product.name, unitPriceSnapshot: item.unit, quantity: item.cartItem.quantity, customNote: item.cartItem.customNote, options: { create: item.cartItem.options.map(({ optionId, option }) => ({ optionId, optionNameSnapshot: option.name, priceModifierSnapshot: option.priceModifier })) } } });
                reservationItems.push({ orderItemId: oi.id, productId: item.cartItem.productId, quantity: item.cartItem.quantity });
            }
            await tx.orderStatusHistory.create({ data: { orderId: order.id, status: client_1.OrderStatus.PAYMENT_PENDING } });
            const at = dto.scheduledAt ? new Date(dto.scheduledAt) : new Date();
            await this.reservations.reserve(tx, order.id, reservationItems, at, new Date(Date.now() + 10 * 60 * 1000));
            await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
            return tx.order.findUniqueOrThrow({ where: { id: order.id }, include: { items: { include: { options: true } }, stockReservations: true, statusHistory: true } });
        });
        await this.queues.scheduleStockTimeout(created.id);
        return created;
    }
    async listAdmin(q) { const { page, limit } = (0, pagination_util_1.normalizePagination)(q.page, q.limit); const where = { deletedAt: null, ...(q.status ? { status: q.status } : {}), ...(q.deliveryType ? { deliveryType: q.deliveryType } : {}), ...(q.paymentStatus ? { payments: { some: { status: q.paymentStatus } } } : {}), ...(q.assigned === true ? { delivery: { courierId: { not: null } } } : {}), ...(q.assigned === false ? { OR: [{ delivery: null }, { delivery: { courierId: null } }] } : {}), ...(q.startDate || q.endDate ? { createdAt: { ...(q.startDate ? { gte: new Date(q.startDate) } : {}), ...(q.endDate ? { lte: new Date(q.endDate) } : {}) } } : {}), ...(q.search ? { OR: [{ orderNumber: { contains: q.search, mode: 'insensitive' } }, { user: { firstName: { contains: q.search, mode: 'insensitive' } } }, { user: { lastName: { contains: q.search, mode: 'insensitive' } } }, { user: { phone: { contains: q.search } } }] } : {}) }; const [items, total] = await this.prisma.$transaction([this.prisma.order.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { [q.sortBy ?? 'createdAt']: q.sortOrder ?? 'desc' }, include: { user: { select: { id: true, firstName: true, lastName: true, phone: true } }, payments: { orderBy: { createdAt: 'desc' }, take: 1, select: { status: true } }, delivery: { include: { courier: { include: { user: { select: { firstName: true, lastName: true, phone: true } } } } } } } }), this.prisma.order.count({ where })]); return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } }; }
    mine(userId) { return this.prisma.order.findMany({ where: { userId, deletedAt: null }, include: { items: { include: { review: true, options: true, product: { select: { id: true, slug: true, name: true } } } }, statusHistory: true, payments: { orderBy: { createdAt: 'desc' }, take: 1 } }, orderBy: { createdAt: 'desc' } }); }
    async getForUser(user, id) { const canViewAll = user.permissions.includes('orders.viewAll'); const where = { id, deletedAt: null, ...(!canViewAll ? { userId: user.sub } : {}) }; const o = await this.prisma.order.findFirst({ where, include: this.detailInclude() }); if (!o)
        throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.ORDER_NOT_FOUND, 'Order not found', common_1.HttpStatus.NOT_FOUND); return o; }
    async updateStatus(id, dto, actor) {
        const noteTrimmed = dto.note?.trim() ?? '';
        const cancelNoteMin = 5;
        return this.prisma.$transaction(async (tx) => {
            const o = await tx.order.findFirst({ where: { id, deletedAt: null } });
            if (!o)
                throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.ORDER_NOT_FOUND, 'Order not found', common_1.HttpStatus.NOT_FOUND);
            if (dto.status === client_1.OrderStatus.CANCELLED && noteTrimmed.length < cancelNoteMin) {
                throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.VALIDATION_FAILED, `İptal için en az ${cancelNoteMin} karakter nedeni yazın`, common_1.HttpStatus.BAD_REQUEST);
            }
            const unpaidPendingCancel = o.status === client_1.OrderStatus.PAYMENT_PENDING && dto.status === client_1.OrderStatus.CANCELLED;
            const paidCount = await tx.payment.count({ where: { orderId: id, status: client_1.PaymentStatus.SUCCESS } });
            if (!unpaidPendingCancel && !paidCount) {
                throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.VALIDATION_FAILED, 'Ödemesi henüz alınmadığı için bu durumu seçemezsiniz. Ödeme bekleyen siparişlerde yalnızca iptal yapılabilir.', common_1.HttpStatus.BAD_REQUEST);
            }
            this.statuses.assert(o.status, dto.status);
            if (unpaidPendingCancel) {
                await tx.stockReservation.updateMany({ where: { orderId: id, status: client_1.StockReservationStatus.ACTIVE }, data: { status: client_1.StockReservationStatus.RELEASED, releasedAt: new Date() } });
            }
            if (o.status === client_1.OrderStatus.DELIVERED && dto.status === client_1.OrderStatus.CANCELLED) {
                await this.loyalty.reverseEarnForDeliveredOrderIfAny(id, tx, actor?.sub, noteTrimmed);
            }
            const updated = await tx.order.update({ where: { id }, data: { status: dto.status } });
            await tx.orderStatusHistory.create({ data: { orderId: id, status: dto.status, note: noteTrimmed.length ? noteTrimmed : null } });
            await this.audit.log({ actorId: actor?.sub, action: 'orders.updateStatus', entityType: 'Order', entityId: id, oldValues: { status: o.status }, newValues: { status: dto.status, note: noteTrimmed || null } }, tx);
            if (dto.status === client_1.OrderStatus.DELIVERED)
                await this.loyalty.earnForDeliveredOrder(id, tx, actor?.sub);
            await this.notifications.createOrderStatusNotification(tx, o.userId, o.orderNumber, dto.status);
            return updated;
        });
    }
    async assignCourier(id, dto, actor) { return this.prisma.$transaction(async (tx) => { const order = await tx.order.findFirst({ where: { id, deletedAt: null }, include: { delivery: true } }); if (!order)
        throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.ORDER_NOT_FOUND, 'Order not found', common_1.HttpStatus.NOT_FOUND); if (order.deliveryType !== client_1.DeliveryType.HOME_DELIVERY)
        throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.ORDER_NOT_ASSIGNABLE, 'Pickup orders cannot be assigned', common_1.HttpStatus.BAD_REQUEST); if (order.status !== client_1.OrderStatus.READY && order.status !== client_1.OrderStatus.ASSIGNED_TO_COURIER)
        throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.ORDER_NOT_ASSIGNABLE, 'Order is not ready for courier assignment', common_1.HttpStatus.BAD_REQUEST); const courier = await tx.courier.findFirst({ where: { id: dto.courierId, deletedAt: null, status: client_1.CourierStatus.ACTIVE } }); if (!courier)
        throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.COURIER_NOT_FOUND, 'Courier not found', common_1.HttpStatus.NOT_FOUND); if (order.status === client_1.OrderStatus.ASSIGNED_TO_COURIER) {
        const d = order.delivery;
        if (!d || d.status !== client_1.DeliveryStatus.ASSIGNED)
            throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.ORDER_NOT_ASSIGNABLE, 'Courier can only be reassigned before the delivery has started', common_1.HttpStatus.BAD_REQUEST);
        if (d.courierId === courier.id)
            return { orderId: id, delivery: d };
        const updatedDelivery = await tx.delivery.update({ where: { orderId: id }, data: { courierId: courier.id, status: client_1.DeliveryStatus.ASSIGNED } });
        await this.audit.log({ actorId: actor?.sub, action: 'orders.assignCourier', entityType: 'Order', entityId: id, oldValues: { courierId: d.courierId }, newValues: { courierId: courier.id, reassignment: true } }, tx);
        return { orderId: id, delivery: updatedDelivery };
    } this.statuses.assert(order.status, client_1.OrderStatus.ASSIGNED_TO_COURIER); const delivery = await tx.delivery.upsert({ where: { orderId: id }, update: { courierId: courier.id, status: client_1.DeliveryStatus.ASSIGNED }, create: { orderId: id, courierId: courier.id, status: client_1.DeliveryStatus.ASSIGNED } }); await tx.order.update({ where: { id }, data: { status: client_1.OrderStatus.ASSIGNED_TO_COURIER } }); await tx.orderStatusHistory.create({ data: { orderId: id, status: client_1.OrderStatus.ASSIGNED_TO_COURIER } }); await this.audit.log({ actorId: actor?.sub, action: 'orders.assignCourier', entityType: 'Order', entityId: id, newValues: { courierId: courier.id, status: client_1.OrderStatus.ASSIGNED_TO_COURIER } }, tx); await this.notifications.createOrderStatusNotification(tx, order.userId, order.orderNumber, client_1.OrderStatus.ASSIGNED_TO_COURIER); return { orderId: id, delivery }; }); }
    async cancel(userId, id) { return this.prisma.$transaction(async (tx) => { const o = await tx.order.findFirst({ where: { id, userId, deletedAt: null } }); if (!o)
        throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.ORDER_NOT_FOUND, 'Order not found', common_1.HttpStatus.NOT_FOUND); this.statuses.assert(o.status, client_1.OrderStatus.CANCELLED); await tx.stockReservation.updateMany({ where: { orderId: id, status: client_1.StockReservationStatus.ACTIVE }, data: { status: client_1.StockReservationStatus.RELEASED, releasedAt: new Date() } }); const order = await tx.order.update({ where: { id }, data: { status: client_1.OrderStatus.CANCELLED } }); await tx.orderStatusHistory.create({ data: { orderId: id, status: client_1.OrderStatus.CANCELLED } }); await this.audit.log({ actorId: userId, action: 'orders.cancel', entityType: 'Order', entityId: id, newValues: { status: client_1.OrderStatus.CANCELLED } }, tx); await this.notifications.createOrderStatusNotification(tx, o.userId, o.orderNumber, client_1.OrderStatus.CANCELLED); return order; }); }
    detailInclude() { return { user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } }, items: { include: { options: true, review: true, product: { select: { id: true, slug: true, name: true } } } }, statusHistory: true, payments: true, stockReservations: true, pickupStore: true, delivery: { include: { courier: { include: { user: { select: { id: true, firstName: true, lastName: true, phone: true } } } } } } }; }
    async nextOrderNumber(tx, now = new Date()) {
        const prefix = (0, order_number_util_1.orderNumberDatePrefix)(now);
        const latest = await tx.order.findMany({
            where: { orderNumber: { startsWith: prefix } },
            orderBy: { orderNumber: 'desc' },
            select: { orderNumber: true },
            take: 100,
        });
        const maxSequence = latest.reduce((max, { orderNumber }) => {
            const match = orderNumber.match(new RegExp(`^${prefix}(\\d{3})$`));
            return match ? Math.max(max, Number(match[1])) : max;
        }, 0);
        return (0, order_number_util_1.createOrderNumber)(maxSequence + 1, now);
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(prisma_service_1.PrismaService)),
    __param(1, (0, common_1.Inject)(stock_reservations_service_1.StockReservationsService)),
    __param(2, (0, common_1.Inject)(order_status_service_1.OrderStatusService)),
    __param(3, (0, common_1.Inject)(queues_service_1.QueuesService)),
    __param(4, (0, common_1.Inject)(audit_service_1.AuditService)),
    __param(5, (0, common_1.Inject)(loyalty_service_1.LoyaltyService)),
    __param(6, (0, common_1.Inject)(notifications_service_1.NotificationsService)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, stock_reservations_service_1.StockReservationsService, order_status_service_1.OrderStatusService, queues_service_1.QueuesService, audit_service_1.AuditService, loyalty_service_1.LoyaltyService, notifications_service_1.NotificationsService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map
