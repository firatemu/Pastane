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
exports.DeliveryZonesService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../database/prisma.service");
const app_exception_1 = require("../common/exceptions/app.exception");
const pagination_util_1 = require("../common/utils/pagination.util");
const error_codes_1 = require("../common/constants/error-codes");
let DeliveryZonesService = class DeliveryZonesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(page, limit) { const p = (0, pagination_util_1.normalizePagination)(page, limit); const [items, total] = await this.prisma.$transaction([this.prisma.deliveryZone.findMany({ where: { deletedAt: null, isActive: true }, skip: (p.page - 1) * p.limit, take: p.limit }), this.prisma.deliveryZone.count({ where: { deletedAt: null, isActive: true } })]); return { items, meta: { ...p, total, totalPages: Math.ceil(total / p.limit) } }; }
    async get(id) { const x = await this.prisma.deliveryZone.findFirst({ where: { id, deletedAt: null } }); if (!x)
        throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.DELIVERY_ZONE_NOT_FOUND, 'Delivery zone not found', common_1.HttpStatus.NOT_FOUND); return x; }
    create(dto) { return this.prisma.deliveryZone.create({ data: { name: dto.name, minimumOrderPrice: dto.minimumOrderPrice === undefined ? undefined : new client_1.Prisma.Decimal(dto.minimumOrderPrice), deliveryFee: new client_1.Prisma.Decimal(dto.deliveryFee), estimatedMinutes: dto.estimatedMinutes, isActive: dto.isActive } }); }
    async update(id, dto) { await this.get(id); return this.prisma.deliveryZone.update({ where: { id }, data: this.data(dto) }); }
    async remove(id) { await this.get(id); return this.prisma.deliveryZone.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } }); }
    data(dto) { return { ...dto, ...(dto.minimumOrderPrice !== undefined ? { minimumOrderPrice: new client_1.Prisma.Decimal(dto.minimumOrderPrice) } : {}), ...(dto.deliveryFee !== undefined ? { deliveryFee: new client_1.Prisma.Decimal(dto.deliveryFee) } : {}) }; }
};
exports.DeliveryZonesService = DeliveryZonesService;
exports.DeliveryZonesService = DeliveryZonesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(prisma_service_1.PrismaService)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DeliveryZonesService);
//# sourceMappingURL=delivery-zones.service.js.map