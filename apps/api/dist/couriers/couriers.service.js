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
exports.CouriersService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const library_1 = require("@prisma/client/runtime/library");
const bcryptjs_1 = require("bcryptjs");
const audit_service_1 = require("../audit/audit.service");
const error_codes_1 = require("../common/constants/error-codes");
const app_exception_1 = require("../common/exceptions/app.exception");
const pagination_util_1 = require("../common/utils/pagination.util");
const prisma_service_1 = require("../database/prisma.service");
const ACTIVE_DELIVERY_STATUSES = [
    client_1.DeliveryStatus.ASSIGNED,
    client_1.DeliveryStatus.PICKED_UP,
    client_1.DeliveryStatus.OUT_FOR_DELIVERY,
];
const userPublicSelect = {
    id: true,
    firstName: true,
    lastName: true,
    phone: true,
    email: true,
    status: true,
};
function canManageCouriers(user) {
    if (!user?.permissions?.length)
        return false;
    return user.permissions.includes('couriers.create') || user.permissions.includes('couriers.update');
}
let CouriersService = class CouriersService {
    prisma;
    audit;
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    async list(q, user) {
        const { page, limit } = (0, pagination_util_1.normalizePagination)(q.page, q.limit);
        const includeRemoved = q.includeRemoved === true;
        if (includeRemoved && !canManageCouriers(user)) {
            throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.FORBIDDEN, 'Forbidden', common_1.HttpStatus.FORBIDDEN);
        }
        const where = {
            ...(includeRemoved ? {} : { deletedAt: null }),
            ...(q.status ? { status: q.status } : {}),
            ...(q.search
                ? {
                    user: {
                        OR: [
                            { firstName: { contains: q.search, mode: 'insensitive' } },
                            { lastName: { contains: q.search, mode: 'insensitive' } },
                            { phone: { contains: q.search } },
                        ],
                    },
                }
                : {}),
        };
        const [items, total] = await this.prisma.$transaction([
            this.prisma.courier.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    user: { select: userPublicSelect },
                    _count: { select: { deliveries: true } },
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.courier.count({ where }),
        ]);
        return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    }
    async getById(id, user) {
        const courier = await this.prisma.courier.findFirst({
            where: { id },
            include: {
                user: { select: userPublicSelect },
                _count: { select: { deliveries: true } },
            },
        });
        if (!courier) {
            throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.COURIER_NOT_FOUND, 'Courier not found', common_1.HttpStatus.NOT_FOUND);
        }
        if (courier.deletedAt && !canManageCouriers(user)) {
            throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.COURIER_NOT_FOUND, 'Courier not found', common_1.HttpStatus.NOT_FOUND);
        }
        return courier;
    }
    async create(dto, actor) {
        const existing = await this.prisma.user.findFirst({
            where: { OR: [{ phone: dto.phone }, ...(dto.email ? [{ email: dto.email }] : [])] },
        });
        if (existing) {
            throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.USER_ALREADY_EXISTS, 'User already exists', common_1.HttpStatus.CONFLICT);
        }
        const courierRole = await this.prisma.role.findUnique({ where: { name: client_1.RoleType.COURIER } });
        if (!courierRole) {
            throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.ROLE_NOT_FOUND, 'Courier role not found', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
        const passwordHash = await (0, bcryptjs_1.hash)(dto.password, 12);
        const status = dto.status ?? client_1.CourierStatus.ACTIVE;
        try {
            const result = await this.prisma.$transaction(async (tx) => {
                const createdUser = await tx.user.create({
                    data: {
                        firstName: dto.firstName,
                        lastName: dto.lastName,
                        phone: dto.phone,
                        email: dto.email ?? undefined,
                        passwordHash,
                        status: client_1.UserStatus.ACTIVE,
                        roleId: courierRole.id,
                    },
                });
                const createdCourier = await tx.courier.create({
                    data: {
                        userId: createdUser.id,
                        vehicle: dto.vehicle ?? undefined,
                        status,
                    },
                    include: { user: { select: userPublicSelect }, _count: { select: { deliveries: true } } },
                });
                await this.audit.log({
                    actorId: actor?.sub,
                    action: 'couriers.create',
                    entityType: 'Courier',
                    entityId: createdCourier.id,
                    newValues: {
                        id: createdCourier.id,
                        userId: createdCourier.userId,
                        vehicle: createdCourier.vehicle,
                        status: createdCourier.status,
                    },
                }, tx);
                return createdCourier;
            });
            return result;
        }
        catch (e) {
            if (e instanceof library_1.PrismaClientKnownRequestError && e.code === 'P2002') {
                throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.USER_ALREADY_EXISTS, 'Phone or email already in use', common_1.HttpStatus.CONFLICT);
            }
            throw e;
        }
    }
    async update(id, dto, actor) {
        const courier = await this.prisma.courier.findFirst({
            where: { id },
            include: { user: true },
        });
        if (!courier) {
            throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.COURIER_NOT_FOUND, 'Courier not found', common_1.HttpStatus.NOT_FOUND);
        }
        if (courier.deletedAt && !canManageCouriers(actor)) {
            throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.COURIER_NOT_FOUND, 'Courier not found', common_1.HttpStatus.NOT_FOUND);
        }
        if (dto.phone !== undefined || dto.email !== undefined) {
            const dup = await this.prisma.user.findFirst({
                where: {
                    id: { not: courier.userId },
                    OR: [...(dto.phone ? [{ phone: dto.phone }] : []), ...(dto.email ? [{ email: dto.email }] : [])],
                },
            });
            if (dup) {
                throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.USER_ALREADY_EXISTS, 'Phone or email already in use', common_1.HttpStatus.CONFLICT);
            }
        }
        const passwordHash = dto.newPassword ? await (0, bcryptjs_1.hash)(dto.newPassword, 12) : undefined;
        try {
            const updated = await this.prisma.$transaction(async (tx) => {
                const userData = {
                    ...(dto.firstName !== undefined ? { firstName: dto.firstName } : {}),
                    ...(dto.lastName !== undefined ? { lastName: dto.lastName } : {}),
                    ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
                    ...(dto.email !== undefined ? { email: dto.email } : {}),
                    ...(passwordHash !== undefined ? { passwordHash } : {}),
                };
                if (Object.keys(userData).length > 0) {
                    await tx.user.update({ where: { id: courier.userId }, data: userData });
                }
                const courierData = {
                    ...(dto.vehicle !== undefined ? { vehicle: dto.vehicle } : {}),
                };
                if (Object.keys(courierData).length > 0) {
                    await tx.courier.update({
                        where: { id },
                        data: courierData,
                    });
                }
                const fresh = await tx.courier.findFirstOrThrow({
                    where: { id },
                    include: { user: { select: userPublicSelect }, _count: { select: { deliveries: true } } },
                });
                await this.audit.log({
                    actorId: actor?.sub,
                    action: 'couriers.update',
                    entityType: 'Courier',
                    entityId: id,
                    oldValues: {
                        vehicle: courier.vehicle,
                        userId: courier.userId,
                    },
                    newValues: {
                        vehicle: fresh.vehicle,
                        userId: fresh.userId,
                        user: fresh.user,
                    },
                }, tx);
                return fresh;
            });
            return updated;
        }
        catch (e) {
            if (e instanceof library_1.PrismaClientKnownRequestError && e.code === 'P2002') {
                throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.USER_ALREADY_EXISTS, 'Phone or email already in use', common_1.HttpStatus.CONFLICT);
            }
            throw e;
        }
    }
    async deactivate(id, actor) {
        const courier = await this.prisma.courier.findFirst({
            where: { id, deletedAt: null },
            include: { user: true },
        });
        if (!courier) {
            throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.COURIER_NOT_FOUND, 'Courier not found', common_1.HttpStatus.NOT_FOUND);
        }
        const activeCount = await this.prisma.delivery.count({
            where: { courierId: id, status: { in: ACTIVE_DELIVERY_STATUSES } },
        });
        if (activeCount > 0) {
            throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.COURIER_HAS_ACTIVE_DELIVERIES, 'Courier has active deliveries', common_1.HttpStatus.CONFLICT);
        }
        const now = new Date();
        await this.prisma.$transaction(async (tx) => {
            await tx.courier.update({
                where: { id },
                data: { status: client_1.CourierStatus.INACTIVE, deletedAt: now },
            });
            await tx.user.update({
                where: { id: courier.userId },
                data: { status: client_1.UserStatus.INACTIVE },
            });
            await tx.refreshToken.updateMany({
                where: { userId: courier.userId, revokedAt: null },
                data: { revokedAt: now },
            });
            await this.audit.log({
                actorId: actor?.sub,
                action: 'couriers.deactivate',
                entityType: 'Courier',
                entityId: id,
                oldValues: { status: courier.status, deletedAt: courier.deletedAt },
                newValues: { status: client_1.CourierStatus.INACTIVE, deletedAt: now.toISOString() },
            }, tx);
        });
        return this.getById(id, actor);
    }
    async reactivate(id, actor) {
        const courier = await this.prisma.courier.findFirst({
            where: { id },
            include: { user: true },
        });
        if (!courier) {
            throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.COURIER_NOT_FOUND, 'Courier not found', common_1.HttpStatus.NOT_FOUND);
        }
        if (courier.deletedAt === null && courier.status === client_1.CourierStatus.ACTIVE) {
            return this.getById(id, actor);
        }
        await this.prisma.$transaction(async (tx) => {
            await tx.courier.update({
                where: { id },
                data: { status: client_1.CourierStatus.ACTIVE, deletedAt: null },
            });
            await tx.user.update({
                where: { id: courier.userId },
                data: { status: client_1.UserStatus.ACTIVE },
            });
            await this.audit.log({
                actorId: actor?.sub,
                action: 'couriers.reactivate',
                entityType: 'Courier',
                entityId: id,
                oldValues: {
                    status: courier.status,
                    deletedAt: courier.deletedAt?.toISOString() ?? null,
                },
                newValues: { status: client_1.CourierStatus.ACTIVE, deletedAt: null },
            }, tx);
        });
        return this.getById(id, actor);
    }
};
exports.CouriersService = CouriersService;
exports.CouriersService = CouriersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(prisma_service_1.PrismaService)),
    __param(1, (0, common_1.Inject)(audit_service_1.AuditService)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], CouriersService);
//# sourceMappingURL=couriers.service.js.map