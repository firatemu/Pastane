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
exports.SettingsService = void 0;
const common_1 = require("@nestjs/common");
const audit_service_1 = require("../audit/audit.service");
const prisma_service_1 = require("../database/prisma.service");
const DEFAULTS = {
    otpActive: false,
    deliveryActive: true,
    pickupActive: true,
    loyaltyActive: true,
    paymentActive: true,
    minimumOrderValue: 0,
};
let SettingsService = class SettingsService {
    prisma;
    audit;
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    async list() {
        await this.ensureDefaults();
        return this.prisma.setting.findMany({ orderBy: { key: 'asc' } });
    }
    async system() {
        await this.ensureDefaults();
        const rows = await this.prisma.setting.findMany({ where: { key: { in: Object.keys(DEFAULTS) } } });
        return Object.fromEntries(rows.map((row) => [row.key, row.value]));
    }
    async isEnabled(key) {
        const setting = await this.prisma.setting.findUnique({ where: { key } });
        return Boolean(setting?.value ?? DEFAULTS[key]);
    }
    async upsert(key, value, actor) {
        const old = await this.prisma.setting.findUnique({ where: { key } });
        const setting = await this.prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
        await this.audit.log({ actorId: actor?.sub, action: old ? 'settings.update' : 'settings.create', entityType: 'Setting', entityId: setting.id, oldValues: old?.value, newValues: value });
        return setting;
    }
    async updateSystem(values, actor) {
        const allowed = Object.keys(DEFAULTS);
        const entries = Object.entries(values).filter(([key, value]) => allowed.includes(key) && value !== undefined);
        const updated = [];
        for (const [key, value] of entries)
            updated.push(await this.upsert(key, value, actor));
        return updated;
    }
    async ensureDefaults() {
        for (const [key, value] of Object.entries(DEFAULTS))
            await this.prisma.setting.upsert({ where: { key }, update: {}, create: { key, value } });
    }
};
exports.SettingsService = SettingsService;
exports.SettingsService = SettingsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(prisma_service_1.PrismaService)),
    __param(1, (0, common_1.Inject)(audit_service_1.AuditService)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, audit_service_1.AuditService])
], SettingsService);
//# sourceMappingURL=settings.service.js.map