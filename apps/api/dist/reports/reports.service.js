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
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../database/prisma.service");
let ReportsService = class ReportsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async dashboard() { const today = new Date(); today.setHours(0, 0, 0, 0); const [awaitingAction, inPreparation, readyForAssignment, lowStock, outOfStock, pendingReviews] = await Promise.all([this.prisma.order.count({ where: { status: client_1.OrderStatus.CONFIRMED, deletedAt: null } }), this.prisma.order.count({ where: { status: client_1.OrderStatus.PREPARING, deletedAt: null } }), this.prisma.order.count({ where: { status: client_1.OrderStatus.READY, deliveryType: 'HOME_DELIVERY', delivery: null, deletedAt: null } }), this.prisma.stockEntry.count({ where: { date: today, quantity: { lte: 5 }, deletedAt: null } }), this.prisma.product.count({ where: { status: client_1.ProductStatus.OUT_OF_STOCK, deletedAt: null } }), this.prisma.review.count({ where: { status: client_1.ReviewStatus.PENDING, deletedAt: null } })]); return { awaitingAction, inPreparation, readyForAssignment, lowStock, outOfStock, pendingReviews }; }
    async sales(q) { const range = this.range(q); const rows = await this.prisma.order.aggregate({ _sum: { grandTotal: true }, _count: { _all: true }, where: { status: { in: [client_1.OrderStatus.CONFIRMED, client_1.OrderStatus.PREPARING, client_1.OrderStatus.READY, client_1.OrderStatus.ASSIGNED_TO_COURIER, client_1.OrderStatus.OUT_FOR_DELIVERY, client_1.OrderStatus.DELIVERED] }, createdAt: range, deletedAt: null, payments: { some: { status: client_1.PaymentStatus.SUCCESS } } } }); return { orderCount: rows._count._all, grossSales: rows._sum.grandTotal ?? 0 }; }
    async products(q) { const range = this.range(q); const grouped = await this.prisma.orderItem.groupBy({ by: ['productId', 'productNameSnapshot'], _sum: { quantity: true }, where: { order: { createdAt: range, status: { not: client_1.OrderStatus.CANCELLED }, deletedAt: null } }, orderBy: { _sum: { quantity: 'desc' } }, take: 5 }); return { topProducts: grouped }; }
    range(q) { return q.startDate || q.endDate ? { ...(q.startDate ? { gte: new Date(q.startDate) } : {}), ...(q.endDate ? { lte: new Date(q.endDate) } : {}) } : undefined; }
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(prisma_service_1.PrismaService)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReportsService);
//# sourceMappingURL=reports.service.js.map