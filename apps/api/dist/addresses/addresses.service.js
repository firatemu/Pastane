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
exports.AddressesService = void 0;
const common_1 = require("@nestjs/common");
const error_codes_1 = require("../common/constants/error-codes");
const app_exception_1 = require("../common/exceptions/app.exception");
const prisma_service_1 = require("../database/prisma.service");
let AddressesService = class AddressesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    list(userId) {
        return this.prisma.address.findMany({
            where: { userId, deletedAt: null },
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
        });
    }
    async create(userId, dto) {
        this.assertLatitudeLongitudeConsistency(dto);
        this.normalizeDtoMapAddress(dto);
        return this.prisma.$transaction(async (tx) => {
            const activeCount = await tx.address.count({ where: { userId, deletedAt: null } });
            const isDefault = dto.isDefault ?? activeCount === 0;
            if (isDefault) {
                await tx.address.updateMany({
                    where: { userId, deletedAt: null, isDefault: true },
                    data: { isDefault: false },
                });
            }
            return tx.address.create({ data: { ...dto, userId, isDefault } });
        });
    }
    async update(userId, id, dto) {
        // #region agent log
        void fetch('http://127.0.0.1:7512/ingest/11bfe911-4ca5-4444-935d-41d79a3e86de', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '43722c' },
            body: JSON.stringify({
                sessionId: '43722c',
                location: 'addresses.service.ts:update:entry',
                message: 'update reached service (validation passed)',
                hypothesisId: 'H2',
                data: {
                    hasLat: Object.prototype.hasOwnProperty.call(dto, 'latitude'),
                    hasLng: Object.prototype.hasOwnProperty.call(dto, 'longitude'),
                    fullAddressLen: typeof dto.fullAddress === 'string' ? dto.fullAddress.length : undefined,
                },
                timestamp: Date.now(),
            }),
        }).catch(() => { });
        // #endregion
        await this.getOwn(userId, id);
        this.assertLatitudeLongitudeConsistency(dto);
        this.normalizeDtoMapAddress(dto);
        return this.prisma.$transaction(async (tx) => {
            if (dto.isDefault) {
                await tx.address.updateMany({
                    where: { userId, deletedAt: null, isDefault: true, id: { not: id } },
                    data: { isDefault: false },
                });
            }
            return tx.address.update({ where: { id }, data: dto });
        });
    }
    async setDefault(userId, id) {
        await this.getOwn(userId, id);
        return this.prisma.$transaction(async (tx) => {
            await tx.address.updateMany({
                where: { userId, deletedAt: null, isDefault: true, id: { not: id } },
                data: { isDefault: false },
            });
            return tx.address.update({ where: { id }, data: { isDefault: true } });
        });
    }
    async remove(userId, id) {
        const address = await this.getOwn(userId, id);
        return this.prisma.$transaction(async (tx) => {
            const removed = await tx.address.update({
                where: { id },
                data: { deletedAt: new Date(), isDefault: false },
            });
            if (address.isDefault) {
                const fallback = await tx.address.findFirst({
                    where: { userId, deletedAt: null, id: { not: id } },
                    orderBy: { createdAt: 'desc' },
                });
                if (fallback) {
                    await tx.address.update({ where: { id: fallback.id }, data: { isDefault: true } });
                }
            }
            return removed;
        });
    }
    async getOwn(userId, id) {
        const address = await this.prisma.address.findFirst({
            where: { id, userId, deletedAt: null },
        });
        if (!address) {
            throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.ADDRESS_NOT_FOUND, 'Address not found', common_1.HttpStatus.NOT_FOUND);
        }
        return address;
    }
    dtoHasLatitude(dto) {
        return Object.prototype.hasOwnProperty.call(dto, 'latitude');
    }
    dtoHasLongitude(dto) {
        return Object.prototype.hasOwnProperty.call(dto, 'longitude');
    }
    normalizeDtoMapAddress(dto) {
        if (!Object.prototype.hasOwnProperty.call(dto, 'mapAddress')) {
            return;
        }
        const raw = dto.mapAddress;
        if (raw === undefined) {
            return;
        }
        if (raw === null) {
            dto.mapAddress = null;
            return;
        }
        const trimmed = raw.trim();
        dto.mapAddress = trimmed.length ? trimmed : null;
    }
    assertLatitudeLongitudeConsistency(dto) {
        const mentionsLat = this.dtoHasLatitude(dto);
        const mentionsLng = this.dtoHasLongitude(dto);
        if (mentionsLat !== mentionsLng) {
            throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.VALIDATION_FAILED, 'Enlem ve boylam aynı istek içinde birlikte gönderilmelidir.', common_1.HttpStatus.BAD_REQUEST);
        }
        if (!mentionsLat) {
            return;
        }
        const { latitude: latRaw, longitude: lngRaw } = dto;
        const latAbsent = latRaw === undefined || latRaw === null;
        const lngAbsent = lngRaw === undefined || lngRaw === null;
        if (latAbsent !== lngAbsent) {
            throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.VALIDATION_FAILED, 'Enlem ve boylam birlikte doldurulmalı veya birlikte boş bırakılmalıdır.', common_1.HttpStatus.BAD_REQUEST);
        }
        if (latAbsent || lngAbsent) {
            return;
        }
        if (typeof latRaw === 'number' &&
            typeof lngRaw === 'number' &&
            Number.isFinite(latRaw) &&
            Number.isFinite(lngRaw)) {
            return;
        }
        throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.VALIDATION_FAILED, 'Geçerli bir enlem ve boylam göndermelisiniz.', common_1.HttpStatus.BAD_REQUEST);
    }
};
exports.AddressesService = AddressesService;
exports.AddressesService = AddressesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(prisma_service_1.PrismaService)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AddressesService);
//# sourceMappingURL=addresses.service.js.map