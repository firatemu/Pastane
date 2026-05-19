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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const bcryptjs_1 = require("bcryptjs");
const prisma_service_1 = require("../database/prisma.service");
const app_exception_1 = require("../common/exceptions/app.exception");
const error_codes_1 = require("../common/constants/error-codes");
let UsersService = class UsersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    list() { return this.prisma.user.findMany({ where: { deletedAt: null }, select: { id: true, firstName: true, lastName: true, phone: true, email: true, status: true, role: { select: { name: true } }, isPhoneVerified: true } }); }
    async getById(id) { const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null }, select: { id: true, firstName: true, lastName: true, phone: true, email: true, status: true, role: { select: { name: true } }, isPhoneVerified: true } }); if (!user)
        throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.USER_NOT_FOUND, 'User not found', common_1.HttpStatus.NOT_FOUND); return user; }
    async update(id, dto) { await this.getById(id); return this.prisma.user.update({ where: { id }, data: dto, select: { id: true, firstName: true, lastName: true, phone: true, email: true, status: true, isPhoneVerified: true } }); }
    async updateOwn(id, dto) { await this.getById(id); return this.prisma.user.update({ where: { id }, data: dto, select: { id: true, firstName: true, lastName: true, phone: true, email: true, status: true, isPhoneVerified: true, role: { select: { name: true } } } }); }
    async changeOwnPassword(id, dto) { const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null } }); if (!user)
        throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.USER_NOT_FOUND, 'User not found', common_1.HttpStatus.NOT_FOUND); if (!(await (0, bcryptjs_1.compare)(dto.currentPassword, user.passwordHash)))
        throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.AUTH_INVALID_CREDENTIALS, 'Current password is invalid', common_1.HttpStatus.UNAUTHORIZED); await this.prisma.user.update({ where: { id }, data: { passwordHash: await (0, bcryptjs_1.hash)(dto.newPassword, 12) } }); return { changed: true }; }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(prisma_service_1.PrismaService)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map