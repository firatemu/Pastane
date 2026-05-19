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
exports.CampaignsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const audit_service_1 = require("../audit/audit.service");
const error_codes_1 = require("../common/constants/error-codes");
const app_exception_1 = require("../common/exceptions/app.exception");
const prisma_service_1 = require("../database/prisma.service");
let CampaignsService = class CampaignsService {
    prisma;
    audit;
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    list() { return this.prisma.campaign.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' } }); }
    active() { const now = new Date(); return this.prisma.campaign.findMany({ where: { deletedAt: null, status: client_1.CampaignStatus.ACTIVE, startDate: { lte: now }, OR: [{ endDate: null }, { endDate: { gte: now } }] }, orderBy: { startDate: 'desc' } }); }
    async create(dto, actor) { const item = await this.prisma.campaign.create({ data: { name: dto.name, description: dto.description, type: dto.type, value: new client_1.Prisma.Decimal(dto.value), status: dto.status, startDate: new Date(dto.startDate), endDate: dto.endDate ? new Date(dto.endDate) : undefined } }); await this.audit.log({ actorId: actor?.sub, action: 'campaigns.create', entityType: 'Campaign', entityId: item.id, newValues: item }); return item; }
    async update(id, dto, actor) { const old = await this.get(id); const item = await this.prisma.campaign.update({ where: { id }, data: this.data(dto) }); await this.audit.log({ actorId: actor?.sub, action: 'campaigns.update', entityType: 'Campaign', entityId: id, oldValues: old, newValues: item }); return item; }
    async remove(id, actor) { const old = await this.get(id); const item = await this.prisma.campaign.update({ where: { id }, data: { deletedAt: new Date(), status: client_1.CampaignStatus.INACTIVE } }); await this.audit.log({ actorId: actor?.sub, action: 'campaigns.delete', entityType: 'Campaign', entityId: id, oldValues: old }); return item; }
    async get(id) { const item = await this.prisma.campaign.findFirst({ where: { id, deletedAt: null } }); if (!item)
        throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.CAMPAIGN_NOT_FOUND, 'Campaign not found', common_1.HttpStatus.NOT_FOUND); return item; }
    data(dto) { return { ...dto, ...(dto.value !== undefined ? { value: new client_1.Prisma.Decimal(dto.value) } : {}), ...(dto.startDate ? { startDate: new Date(dto.startDate) } : {}), ...(dto.endDate ? { endDate: new Date(dto.endDate) } : {}) }; }
};
exports.CampaignsService = CampaignsService;
exports.CampaignsService = CampaignsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(prisma_service_1.PrismaService)),
    __param(1, (0, common_1.Inject)(audit_service_1.AuditService)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, audit_service_1.AuditService])
], CampaignsService);
//# sourceMappingURL=campaigns.service.js.map