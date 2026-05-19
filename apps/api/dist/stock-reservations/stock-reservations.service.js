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
exports.StockReservationsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const app_exception_1 = require("../common/exceptions/app.exception");
const error_codes_1 = require("../common/constants/error-codes");
const time_window_util_1 = require("../common/utils/time-window.util");
const prisma_service_1 = require("../database/prisma.service");
let StockReservationsService = class StockReservationsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async reserve(tx, orderId, items, at, expiresAt) {
        for (const item of items) {
            const product = await tx.product.findFirst({
                where: { id: item.productId, deletedAt: null, status: client_1.ProductStatus.ACTIVE },
            });
            if (!product)
                throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.PRODUCT_NOT_ACTIVE, 'Product not active', common_1.HttpStatus.BAD_REQUEST);
            const localDate = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit',
            }).format(at);
            const date = (0, time_window_util_1.istanbulDay)(localDate);
            const hhmm = new Intl.DateTimeFormat('en-GB', {
                timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
            }).format(at);
            const entries = await tx.stockEntry.findMany({
                where: { productId: item.productId, date, deletedAt: null },
                orderBy: { createdAt: 'asc' },
            });
            const entry = entries.find((candidate) => (0, time_window_util_1.timeFallsWithinWindow)(hhmm, candidate.availableFrom ?? undefined, candidate.availableTo ?? undefined));
            if (!entry)
                throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.STOCK_WINDOW_NOT_ACTIVE, 'Stock window not active', common_1.HttpStatus.BAD_REQUEST);
            const active = await tx.stockReservation.aggregate({
                where: { stockEntryId: entry.id, status: client_1.StockReservationStatus.ACTIVE, expiresAt: { gt: new Date() } },
                _sum: { quantity: true },
            });
            const available = entry.quantity - (active._sum.quantity ?? 0);
            if (available < item.quantity)
                throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.INSUFFICIENT_STOCK, 'Insufficient stock', common_1.HttpStatus.BAD_REQUEST);
            await tx.stockReservation.create({
                data: { orderId, orderItemId: item.orderItemId, productId: item.productId, stockEntryId: entry.id, quantity: item.quantity, expiresAt },
            });
        }
    }
    async expireOrder(orderId, tx = this.prisma) {
        return tx.stockReservation.updateMany({
            where: { orderId, status: client_1.StockReservationStatus.ACTIVE },
            data: { status: client_1.StockReservationStatus.EXPIRED, releasedAt: new Date() },
        });
    }
};
exports.StockReservationsService = StockReservationsService;
exports.StockReservationsService = StockReservationsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(prisma_service_1.PrismaService)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], StockReservationsService);
//# sourceMappingURL=stock-reservations.service.js.map