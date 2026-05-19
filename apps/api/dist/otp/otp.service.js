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
exports.OtpService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../database/prisma.service");
const app_exception_1 = require("../common/exceptions/app.exception");
const error_codes_1 = require("../common/constants/error-codes");
let OtpService = class OtpService {
    config;
    prisma;
    constructor(config, prisma) {
        this.config = config;
        this.prisma = prisma;
    }
    isEnabled() { return this.config.get('OTP_ACTIVE', 'false') === 'true'; }
    async assertDisabledByDefault() {
        if (!this.isEnabled())
            throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.AUTH_OTP_DISABLED, 'OTP infrastructure is disabled', common_1.HttpStatus.NOT_IMPLEMENTED);
    }
    async verify(phone, code) {
        await this.assertDisabledByDefault();
        const otp = await this.prisma.otpCode.findFirst({ where: { phone, codeHash: code, usedAt: null }, orderBy: { createdAt: 'desc' } });
        if (!otp || otp.expiresAt < new Date())
            throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.AUTH_OTP_INVALID, 'OTP is invalid or expired', common_1.HttpStatus.BAD_REQUEST);
    }
};
exports.OtpService = OtpService;
exports.OtpService = OtpService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(config_1.ConfigService)),
    __param(1, (0, common_1.Inject)(prisma_service_1.PrismaService)),
    __metadata("design:paramtypes", [config_1.ConfigService, prisma_service_1.PrismaService])
], OtpService);
//# sourceMappingURL=otp.service.js.map