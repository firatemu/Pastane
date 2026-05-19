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
exports.StockService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const audit_service_1 = require("../audit/audit.service");
const prisma_service_1 = require("../database/prisma.service");
const app_exception_1 = require("../common/exceptions/app.exception");
const error_codes_1 = require("../common/constants/error-codes");
const time_window_util_1 = require("../common/utils/time-window.util");
let StockService = class StockService {
    prisma;
    audit;
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    list() { return this.prisma.stockEntry.findMany({ where: { deletedAt: null }, include: { product: true }, orderBy: [{ date: 'desc' }, { availableFrom: 'asc' }] }); }
    byProduct(productId) { return this.prisma.stockEntry.findMany({ where: { productId, deletedAt: null }, include: { movements: true }, orderBy: [{ date: 'desc' }, { availableFrom: 'asc' }] }); }
    async create(dto, actor) { await this.assertProduct(dto.productId); this.assertWindow(dto.availableFrom, dto.availableTo); const date = (0, time_window_util_1.istanbulDay)(dto.date.slice(0, 10)); await this.assertNoOverlap(dto.productId, date, dto.availableFrom, dto.availableTo); const created = await this.prisma.stockEntry.create({ data: { ...dto, date } }); await this.audit.log({ actorId: actor?.sub, action: 'stock.create', entityType: 'StockEntry', entityId: created.id, newValues: { productId: created.productId, quantity: created.quantity } }); return created; }
    async update(id, dto, actor) { const x = await this.get(id); const from = dto.availableFrom ?? x.availableFrom ?? undefined, to = dto.availableTo ?? x.availableTo ?? undefined; this.assertWindow(from, to); await this.assertNoOverlap(x.productId, x.date, from, to, id); const updated = await this.prisma.stockEntry.update({ where: { id }, data: dto }); await this.audit.log({ actorId: actor?.sub, action: 'stock.update', entityType: 'StockEntry', entityId: id, oldValues: { quantity: x.quantity }, newValues: { quantity: updated.quantity } }); return updated; }
    async movement(id, dto, actor) { await this.get(id); return this.prisma.$transaction(async (tx) => { const delta = dto.type === client_1.StockMovementType.OUT || dto.type === client_1.StockMovementType.RESERVATION ? -dto.quantity : dto.quantity; await tx.stockEntry.update({ where: { id }, data: { quantity: { increment: delta } } }); const movement = await tx.stockMovement.create({ data: { stockEntryId: id, ...dto } }); await this.audit.log({ actorId: actor?.sub, action: 'stock.movement', entityType: 'StockEntry', entityId: id, newValues: { type: dto.type, quantity: dto.quantity } }, tx); return movement; }); }
    async movements(id) { await this.get(id); return this.prisma.stockMovement.findMany({ where: { stockEntryId: id }, orderBy: { createdAt: 'desc' } }); }
    async get(id) { const x = await this.prisma.stockEntry.findFirst({ where: { id, deletedAt: null } }); if (!x)
        throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.STOCK_ENTRY_NOT_FOUND, 'Stock entry not found', common_1.HttpStatus.NOT_FOUND); return x; }
    async assertProduct(id) { const x = await this.prisma.product.findFirst({ where: { id, deletedAt: null } }); if (!x)
        throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.PRODUCT_NOT_FOUND, 'Product not found', common_1.HttpStatus.NOT_FOUND); }
    assertWindow(f, t) { if (!(0, time_window_util_1.isTimeWindowValid)(f, t))
        throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.VALIDATION_FAILED, 'Invalid Europe/Istanbul stock window', common_1.HttpStatus.BAD_REQUEST); }
    async assertNoOverlap(productId, date, from, to, excludeId) { const rows = await this.prisma.stockEntry.findMany({ where: { productId, date, deletedAt: null, ...(excludeId ? { id: { not: excludeId } } : {}) } }); if (rows.some(r => (0, time_window_util_1.windowsOverlap)(from, to, r.availableFrom ?? undefined, r.availableTo ?? undefined)))
        throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.STOCK_WINDOW_OVERLAP, 'Stock window overlaps an existing Europe/Istanbul window', common_1.HttpStatus.CONFLICT); }
};
exports.StockService = StockService;
exports.StockService = StockService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(prisma_service_1.PrismaService)),
    __param(1, (0, common_1.Inject)(audit_service_1.AuditService)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, audit_service_1.AuditService])
], StockService);
//# sourceMappingURL=stock.service.js.map