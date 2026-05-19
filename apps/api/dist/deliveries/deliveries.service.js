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
exports.DeliveriesService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const audit_service_1 = require("../audit/audit.service");
const error_codes_1 = require("../common/constants/error-codes");
const app_exception_1 = require("../common/exceptions/app.exception");
const pagination_util_1 = require("../common/utils/pagination.util");
const prisma_service_1 = require("../database/prisma.service");
const loyalty_service_1 = require("../loyalty/loyalty.service");
const notifications_service_1 = require("../notifications/notifications.service");
const order_status_service_1 = require("../orders/order-status.service");
const delivery_status_service_1 = require("./delivery-status.service");
let DeliveriesService = class DeliveriesService {
    prisma;
    statuses;
    orderStatuses;
    audit;
    loyalty;
    notifications;
    constructor(prisma, statuses, orderStatuses, audit, loyalty, notifications) {
        this.prisma = prisma;
        this.statuses = statuses;
        this.orderStatuses = orderStatuses;
        this.audit = audit;
        this.loyalty = loyalty;
        this.notifications = notifications;
    }
    async mine(userId, q) {
        const { page, limit } = (0, pagination_util_1.normalizePagination)(q.page, q.limit);
        const where = {
            courier: { userId, deletedAt: null },
            order: { deletedAt: null },
            ...(q.status ? { status: q.status } : {}),
        };
        const [items, total] = await this.prisma.$transaction([
            this.prisma.delivery.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: [{ updatedAt: 'asc' }, { createdAt: 'asc' }],
                include: this.listInclude(),
            }),
            this.prisma.delivery.count({ where }),
        ]);
        return {
            items,
            meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    }
    async getMine(userId, id) {
        const d = await this.prisma.delivery.findFirst({
            where: { id, courier: { userId, deletedAt: null }, order: { deletedAt: null } },
            include: this.detailInclude(),
        });
        if (!d)
            throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.DELIVERY_NOT_FOUND, 'Delivery not found', common_1.HttpStatus.NOT_FOUND);
        return d;
    }
    async pickUp(userId, id) {
        return this.prisma.$transaction(async (tx) => {
            const d = await this.findMineForMutation(tx, userId, id);
            this.statuses.assert(d.status, client_1.DeliveryStatus.PICKED_UP);
            this.orderStatuses.assert(d.order.status, client_1.OrderStatus.OUT_FOR_DELIVERY);
            const updated = await tx.delivery.update({
                where: { id },
                data: { status: client_1.DeliveryStatus.PICKED_UP, pickedUpAt: new Date() },
            });
            await tx.order.update({ where: { id: d.orderId }, data: { status: client_1.OrderStatus.OUT_FOR_DELIVERY } });
            await tx.orderStatusHistory.create({
                data: { orderId: d.orderId, status: client_1.OrderStatus.OUT_FOR_DELIVERY },
            });
            await this.audit.log({
                actorId: userId,
                action: 'deliveries.pickUp',
                entityType: 'Delivery',
                entityId: id,
                newValues: { status: client_1.DeliveryStatus.PICKED_UP, orderStatus: client_1.OrderStatus.OUT_FOR_DELIVERY },
            }, tx);
            await this.notifications.createOrderStatusNotification(tx, d.order.userId, d.order.orderNumber, client_1.OrderStatus.OUT_FOR_DELIVERY);
            return updated;
        });
    }
    async deliver(userId, id) {
        return this.prisma.$transaction(async (tx) => {
            const d = await this.findMineForMutation(tx, userId, id);
            this.statuses.assert(d.status, client_1.DeliveryStatus.DELIVERED);
            this.orderStatuses.assert(d.order.status, client_1.OrderStatus.DELIVERED);
            const updated = await tx.delivery.update({
                where: { id },
                data: { status: client_1.DeliveryStatus.DELIVERED, deliveredAt: new Date() },
            });
            await tx.order.update({ where: { id: d.orderId }, data: { status: client_1.OrderStatus.DELIVERED } });
            await tx.orderStatusHistory.create({ data: { orderId: d.orderId, status: client_1.OrderStatus.DELIVERED } });
            await this.loyalty.earnForDeliveredOrder(d.orderId, tx, userId);
            await this.audit.log({
                actorId: userId,
                action: 'deliveries.deliver',
                entityType: 'Delivery',
                entityId: id,
                newValues: { status: client_1.DeliveryStatus.DELIVERED, orderStatus: client_1.OrderStatus.DELIVERED },
            }, tx);
            await this.notifications.createOrderStatusNotification(tx, d.order.userId, d.order.orderNumber, client_1.OrderStatus.DELIVERED);
            return updated;
        });
    }
    async fail(userId, id, dto) {
        return this.prisma.$transaction(async (tx) => {
            const d = await this.findMineForMutation(tx, userId, id);
            this.statuses.assert(d.status, client_1.DeliveryStatus.FAILED);
            const updated = await tx.delivery.update({
                where: { id },
                data: { status: client_1.DeliveryStatus.FAILED, failedReason: dto.reason.trim() },
            });
            await this.audit.log({
                actorId: userId,
                action: 'deliveries.fail',
                entityType: 'Delivery',
                entityId: id,
                newValues: { status: client_1.DeliveryStatus.FAILED, reason: dto.reason.trim() },
            }, tx);
            return updated;
        });
    }
    async findMineForMutation(tx, userId, id) {
        const d = await tx.delivery.findFirst({
            where: { id, courier: { userId, deletedAt: null }, order: { deletedAt: null } },
            include: { order: { select: { id: true, status: true, userId: true, orderNumber: true } } },
        });
        if (!d)
            throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.DELIVERY_NOT_FOUND, 'Delivery not found', common_1.HttpStatus.NOT_FOUND);
        return d;
    }
    /** Courier list: compact order summary + item count + latest payment status (no card/provider data). */
    listInclude() {
        return {
            order: {
                select: {
                    id: true,
                    orderNumber: true,
                    status: true,
                    scheduledAt: true,
                    createdAt: true,
                    deliveryType: true,
                    grandTotal: true,
                    addressSnapshot: true,
                    user: { select: { id: true, firstName: true, lastName: true, phone: true } },
                    _count: { select: { items: true } },
                    payments: {
                        orderBy: { createdAt: 'desc' },
                        take: 1,
                        select: { status: true },
                    },
                },
            },
        };
    }
    /** Courier detail: full order scalars + relations; latest payment status for operational context. */
    detailInclude() {
        return {
            order: {
                include: {
                    user: { select: { id: true, firstName: true, lastName: true, phone: true } },
                    items: { include: { options: true } },
                    statusHistory: true,
                    payments: {
                        orderBy: { createdAt: 'desc' },
                        take: 1,
                        select: { status: true },
                    },
                },
            },
        };
    }
};
exports.DeliveriesService = DeliveriesService;
exports.DeliveriesService = DeliveriesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(prisma_service_1.PrismaService)),
    __param(1, (0, common_1.Inject)(delivery_status_service_1.DeliveryStatusService)),
    __param(2, (0, common_1.Inject)(order_status_service_1.OrderStatusService)),
    __param(3, (0, common_1.Inject)(audit_service_1.AuditService)),
    __param(4, (0, common_1.Inject)(loyalty_service_1.LoyaltyService)),
    __param(5, (0, common_1.Inject)(notifications_service_1.NotificationsService)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        delivery_status_service_1.DeliveryStatusService,
        order_status_service_1.OrderStatusService,
        audit_service_1.AuditService,
        loyalty_service_1.LoyaltyService,
        notifications_service_1.NotificationsService])
], DeliveriesService);
//# sourceMappingURL=deliveries.service.js.map