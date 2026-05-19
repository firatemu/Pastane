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
exports.LoyaltyService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
const audit_service_1 = require("../audit/audit.service");
const error_codes_1 = require("../common/constants/error-codes");
const app_exception_1 = require("../common/exceptions/app.exception");
const money_util_1 = require("../common/utils/money.util");
const prisma_service_1 = require("../database/prisma.service");
let LoyaltyService = class LoyaltyService {
    prisma;
    audit;
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    qrFor(userId) { return `LOY-${(0, crypto_1.createHash)('sha256').update(`${userId}:${(0, crypto_1.randomUUID)()}`).digest('hex').slice(0, 24).toUpperCase()}`; }
    async accountForUser(userId, client = this.prisma) {
        const existing = await client.loyaltyAccount.findUnique({ where: { userId }, include: { movements: { orderBy: { createdAt: 'desc' }, take: 20 } } });
        if (existing)
            return existing;
        return client.loyaltyAccount.create({ data: { userId, qrCode: this.qrFor(userId) }, include: { movements: true } });
    }
    me(userId) { return this.accountForUser(userId); }
    async movements(userId) { const account = await this.accountForUser(userId); return this.prisma.loyaltyMovement.findMany({ where: { loyaltyAccountId: account.id }, orderBy: { createdAt: 'desc' } }); }
    async scan(qrCode) { const account = await this.prisma.loyaltyAccount.findUnique({ where: { qrCode }, include: { user: { select: { id: true, firstName: true, lastName: true, phone: true } } } }); if (!account)
        throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.LOYALTY_ACCOUNT_NOT_FOUND, 'Loyalty account not found', common_1.HttpStatus.NOT_FOUND); return account; }
    async redeem(dto, actor) {
        return this.prisma.$transaction(async (tx) => {
            const account = await this.findAccountForMutation(tx, dto);
            if (account.points < dto.points)
                throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.INSUFFICIENT_LOYALTY_POINTS, 'Insufficient loyalty points', common_1.HttpStatus.BAD_REQUEST);
            const updated = await tx.loyaltyAccount.update({ where: { id: account.id }, data: { points: { decrement: dto.points } } });
            const movement = await tx.loyaltyMovement.create({ data: { loyaltyAccountId: account.id, type: client_1.LoyaltyMovementType.REDEEM, points: -dto.points, balanceAfter: updated.points, note: dto.note } });
            await this.audit.log({ actorId: actor?.sub, action: 'loyalty.redeem', entityType: 'LoyaltyAccount', entityId: account.id, newValues: { points: -dto.points, balanceAfter: updated.points } }, tx);
            return movement;
        });
    }
    async adjust(dto, actor) {
        return this.prisma.$transaction(async (tx) => {
            const account = await this.findAccountForMutation(tx, dto);
            const updated = await tx.loyaltyAccount.update({ where: { id: account.id }, data: { points: { increment: dto.points } } });
            const movement = await tx.loyaltyMovement.create({ data: { loyaltyAccountId: account.id, type: client_1.LoyaltyMovementType.ADJUSTMENT, points: dto.points, balanceAfter: updated.points, note: dto.note } });
            await this.audit.log({ actorId: actor?.sub, action: 'loyalty.adjust', entityType: 'LoyaltyAccount', entityId: account.id, newValues: { points: dto.points, balanceAfter: updated.points } }, tx);
            return movement;
        });
    }
    /** Teslim sonrası kazanılan puanları, sipariş iptalinde geri al (varsa). */
    async reverseEarnForDeliveredOrderIfAny(orderId, client, actorId, cancelReason) {
        const order = await client.order.findUnique({ where: { id: orderId } });
        if (!order)
            return null;
        const account = await client.loyaltyAccount.findUnique({ where: { userId: order.userId } });
        if (!account)
            return null;
        const earnNote = `Earned from order ${order.orderNumber}`;
        const movement = await client.loyaltyMovement.findFirst({
            where: { loyaltyAccountId: account.id, note: earnNote, type: client_1.LoyaltyMovementType.EARN },
            orderBy: { createdAt: 'desc' },
        });
        if (!movement || movement.points <= 0)
            return null;
        const updated = await client.loyaltyAccount.update({
            where: { id: account.id },
            data: { points: { decrement: movement.points } },
        });
        const reasonSafe = cancelReason.trim().slice(0, 400);
        await client.loyaltyMovement.create({
            data: {
                loyaltyAccountId: account.id,
                type: client_1.LoyaltyMovementType.ADJUSTMENT,
                points: -movement.points,
                balanceAfter: updated.points,
                note: `Teslimat iptali (${order.orderNumber}): ${reasonSafe}`,
            },
        });
        await this.audit.log({
            actorId: actorId ?? null,
            action: 'loyalty.delivered_cancel_reverse',
            entityType: 'Order',
            entityId: order.id,
            newValues: { reversedPoints: movement.points },
        }, client);
        return { reversedPoints: movement.points };
    }
    async earnForDeliveredOrder(orderId, client, actorId) {
        const order = await client.order.findUnique({ where: { id: orderId }, include: { payments: { where: { status: 'SUCCESS' }, take: 1 } } });
        if (!order || order.status !== client_1.OrderStatus.DELIVERED || !order.payments.length)
            return null;
        const existing = await client.loyaltyMovement.findFirst({ where: { note: `Earned from order ${order.orderNumber}` } });
        if (existing)
            return existing;
        const setting = await client.loyaltySetting.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
        if (!setting)
            return null;
        const points = Math.floor(Number(money_util_1.money.multiply(order.grandTotal, setting.earnRate)));
        if (points <= 0)
            return null;
        const account = await this.accountForUser(order.userId, client);
        const updated = await client.loyaltyAccount.update({ where: { id: account.id }, data: { points: { increment: points } } });
        const movement = await client.loyaltyMovement.create({ data: { loyaltyAccountId: account.id, type: client_1.LoyaltyMovementType.EARN, points, balanceAfter: updated.points, note: `Earned from order ${order.orderNumber}` } });
        await this.audit.log({ actorId, action: 'loyalty.earn', entityType: 'Order', entityId: order.id, newValues: { points, balanceAfter: updated.points } }, client);
        return movement;
    }
    settings() { return this.prisma.loyaltySetting.findMany({ orderBy: { createdAt: 'desc' } }); }
    async updateSettings(dto, actor) {
        const current = await this.prisma.loyaltySetting.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
        const setting = await this.prisma.loyaltySetting.create({ data: { earnRate: new client_1.Prisma.Decimal(dto.earnRate ?? Number(current?.earnRate ?? 0.01)), pointValue: new client_1.Prisma.Decimal(dto.pointValue ?? Number(current?.pointValue ?? 1)), minimumRedeem: dto.minimumRedeem ?? current?.minimumRedeem ?? 0, isActive: dto.isActive ?? true } });
        await this.audit.log({ actorId: actor?.sub, action: 'loyalty.settings.update', entityType: 'LoyaltySetting', entityId: setting.id, newValues: setting });
        return setting;
    }
    async findAccountForMutation(tx, dto) {
        const account = dto.userId ? await this.accountForUser(dto.userId, tx) : dto.qrCode ? await tx.loyaltyAccount.findUnique({ where: { qrCode: dto.qrCode } }) : null;
        if (!account)
            throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.LOYALTY_ACCOUNT_NOT_FOUND, 'Loyalty account not found', common_1.HttpStatus.NOT_FOUND);
        return account;
    }
};
exports.LoyaltyService = LoyaltyService;
exports.LoyaltyService = LoyaltyService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(prisma_service_1.PrismaService)),
    __param(1, (0, common_1.Inject)(audit_service_1.AuditService)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, audit_service_1.AuditService])
], LoyaltyService);
//# sourceMappingURL=loyalty.service.js.map