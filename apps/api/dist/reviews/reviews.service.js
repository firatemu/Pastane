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
exports.ReviewsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const audit_service_1 = require("../audit/audit.service");
const error_codes_1 = require("../common/constants/error-codes");
const app_exception_1 = require("../common/exceptions/app.exception");
const pagination_util_1 = require("../common/utils/pagination.util");
const prisma_service_1 = require("../database/prisma.service");
let ReviewsService = class ReviewsService {
    prisma;
    audit;
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    async create(userId, dto) {
        const orderItem = await this.prisma.orderItem.findFirst({
            where: {
                id: dto.orderItemId,
                order: { userId, deletedAt: null, status: client_1.OrderStatus.DELIVERED },
            },
            include: { review: true },
        });
        if (!orderItem) {
            throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.REVIEW_ORDER_ITEM_INVALID, 'Review requires a delivered own order item', common_1.HttpStatus.BAD_REQUEST);
        }
        if (orderItem.review) {
            throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.REVIEW_ALREADY_EXISTS, 'Review already exists for order item', common_1.HttpStatus.BAD_REQUEST);
        }
        return this.prisma.review.create({
            data: {
                userId,
                productId: orderItem.productId,
                orderItemId: orderItem.id,
                rating: dto.rating,
                comment: dto.comment,
                status: client_1.ReviewStatus.PENDING,
            },
        });
    }
    async product(productId, q) {
        const { page, limit } = (0, pagination_util_1.normalizePagination)(q.page, q.limit);
        const where = {
            productId,
            status: client_1.ReviewStatus.APPROVED,
            deletedAt: null,
        };
        const [items, total] = await this.prisma.$transaction([
            this.prisma.review.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                include: { user: { select: { firstName: true, lastName: true } } },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.review.count({ where }),
        ]);
        return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    }
    async mine(userId) {
        return this.prisma.review.findMany({
            where: { userId, deletedAt: null },
            include: { product: { select: { id: true, name: true, slug: true } }, orderItem: { select: { id: true, orderId: true } } },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
    }
    async pending(q) {
        const { page, limit } = (0, pagination_util_1.normalizePagination)(q.page, q.limit);
        const where = {
            status: client_1.ReviewStatus.PENDING,
            deletedAt: null,
            ...(q.productId ? { productId: q.productId } : {}),
            ...(q.startDate || q.endDate
                ? {
                    createdAt: {
                        ...(q.startDate ? { gte: new Date(q.startDate) } : {}),
                        ...(q.endDate ? { lte: new Date(q.endDate) } : {}),
                    },
                }
                : {}),
            ...(q.search
                ? {
                    OR: [
                        { comment: { contains: q.search, mode: 'insensitive' } },
                        { product: { name: { contains: q.search, mode: 'insensitive' } } },
                        { user: { firstName: { contains: q.search, mode: 'insensitive' } } },
                        { user: { lastName: { contains: q.search, mode: 'insensitive' } } },
                    ],
                }
                : {}),
        };
        const [items, total] = await this.prisma.$transaction([
            this.prisma.review.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    user: { select: { id: true, firstName: true, lastName: true } },
                    product: { select: { id: true, name: true } },
                    orderItem: { select: { id: true, orderId: true } },
                },
                orderBy: { createdAt: 'asc' },
            }),
            this.prisma.review.count({ where }),
        ]);
        return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    }
    async approve(id, actorId) {
        await this.getPending(id);
        const updated = await this.prisma.review.update({
            where: { id },
            data: { status: client_1.ReviewStatus.APPROVED, rejectedReason: null },
        });
        await this.audit.log({ actorId, action: 'reviews.approve', entityType: 'Review', entityId: id, newValues: { status: client_1.ReviewStatus.APPROVED } });
        return updated;
    }
    async reject(id, reason, actorId) {
        await this.getPending(id);
        const updated = await this.prisma.review.update({
            where: { id },
            data: { status: client_1.ReviewStatus.REJECTED, rejectedReason: reason },
        });
        await this.audit.log({ actorId, action: 'reviews.reject', entityType: 'Review', entityId: id, newValues: { status: client_1.ReviewStatus.REJECTED, reason } });
        return updated;
    }
    async remove(id, actorId) {
        const x = await this.prisma.review.findFirst({ where: { id, deletedAt: null } });
        if (!x) {
            throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.REVIEW_NOT_FOUND, 'Review not found', common_1.HttpStatus.NOT_FOUND);
        }
        const removed = await this.prisma.review.update({ where: { id }, data: { deletedAt: new Date() } });
        await this.audit.log({ actorId, action: 'reviews.delete', entityType: 'Review', entityId: id });
        return removed;
    }
    async getPending(id) {
        const x = await this.prisma.review.findFirst({ where: { id, deletedAt: null } });
        if (!x) {
            throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.REVIEW_NOT_FOUND, 'Review not found', common_1.HttpStatus.NOT_FOUND);
        }
        if (x.status !== client_1.ReviewStatus.PENDING) {
            throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.REVIEW_STATUS_INVALID, 'Review is not pending', common_1.HttpStatus.BAD_REQUEST);
        }
        return x;
    }
};
exports.ReviewsService = ReviewsService;
exports.ReviewsService = ReviewsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(prisma_service_1.PrismaService)),
    __param(1, (0, common_1.Inject)(audit_service_1.AuditService)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, audit_service_1.AuditService])
], ReviewsService);
//# sourceMappingURL=reviews.service.js.map