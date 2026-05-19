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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const bcryptjs_1 = require("bcryptjs");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../database/prisma.service");
const app_exception_1 = require("../common/exceptions/app.exception");
const error_codes_1 = require("../common/constants/error-codes");
const tr_phone_util_1 = require("../common/utils/tr-phone.util");
let AuthService = class AuthService {
    prisma;
    jwt;
    config;
    constructor(prisma, jwt, config) {
        this.prisma = prisma;
        this.jwt = jwt;
        this.config = config;
    }
    async register(dto) {
        const phone = (0, tr_phone_util_1.normalizeTrMobilePhoneDigits)(dto.phone);
        const existing = await this.prisma.user.findFirst({ where: { OR: [{ phone }, ...(dto.email ? [{ email: dto.email }] : [])] } });
        if (existing)
            throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.USER_ALREADY_EXISTS, 'User already exists', common_1.HttpStatus.CONFLICT);
        const customerRole = await this.prisma.role.findUniqueOrThrow({ where: { name: client_1.RoleType.CUSTOMER } });
        const { password, ...userData } = dto;
        const user = await this.prisma.user.create({ data: { ...userData, phone, passwordHash: await (0, bcryptjs_1.hash)(password, 12), roleId: customerRole.id } });
        return this.createSession(user.id);
    }
    async login(dto) {
        const phone = (0, tr_phone_util_1.normalizeTrMobilePhoneDigits)(dto.phone);
        const user = await this.prisma.user.findUnique({ where: { phone } });
        if (!user || user.deletedAt || user.status !== client_1.UserStatus.ACTIVE || !(await (0, bcryptjs_1.compare)(dto.password, user.passwordHash))) {
            throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.AUTH_INVALID_CREDENTIALS, 'Invalid credentials', common_1.HttpStatus.UNAUTHORIZED);
        }
        return this.createSession(user.id);
    }
    async refresh(rawToken) {
        const payload = await this.verifyRefreshToken(rawToken);
        const tokenHash = await (0, bcryptjs_1.hash)(rawToken, 12);
        const sessions = await this.prisma.refreshToken.findMany({ where: { userId: payload.sub, revokedAt: null, expiresAt: { gt: new Date() } } });
        const session = await this.findMatchingSession(rawToken, sessions);
        if (!session)
            throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.AUTH_REFRESH_TOKEN_INVALID, 'Refresh token is invalid', common_1.HttpStatus.UNAUTHORIZED);
        await this.prisma.refreshToken.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
        void tokenHash;
        return this.createSession(payload.sub);
    }
    async logout(rawToken) {
        const sessions = await this.prisma.refreshToken.findMany({ where: { revokedAt: null, expiresAt: { gt: new Date() } } });
        const session = await this.findMatchingSession(rawToken, sessions);
        if (session)
            await this.prisma.refreshToken.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
        return { loggedOut: true };
    }
    async createSession(userId) {
        const user = await this.prisma.user.findUniqueOrThrow({
            where: { id: userId },
            include: { role: { include: { permissions: { include: { permission: true } } } } },
        });
        const authUser = { sub: user.id, phone: user.phone, role: user.role.name, permissions: user.role.permissions.map((item) => item.permission.code) };
        const accessToken = await this.jwt.signAsync(authUser, { secret: this.config.getOrThrow('JWT_SECRET'), expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN', '15m') });
        const refreshToken = await this.jwt.signAsync({ sub: user.id, jti: (0, crypto_1.randomUUID)() }, { secret: this.config.getOrThrow('JWT_REFRESH_SECRET'), expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '30d') });
        const expiresAt = new Date(Date.now() + this.parseDurationMs(this.config.get('JWT_REFRESH_EXPIRES_IN', '30d')));
        await this.prisma.refreshToken.create({ data: { userId: user.id, tokenHash: await (0, bcryptjs_1.hash)(refreshToken, 12), expiresAt } });
        return { accessToken, refreshToken, user: { id: user.id, firstName: user.firstName, lastName: user.lastName, phone: user.phone, email: user.email, role: user.role.name, isPhoneVerified: user.isPhoneVerified } };
    }
    async verifyRefreshToken(token) {
        try {
            return await this.jwt.verifyAsync(token, { secret: this.config.getOrThrow('JWT_REFRESH_SECRET') });
        }
        catch {
            throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.AUTH_REFRESH_TOKEN_INVALID, 'Refresh token is invalid', common_1.HttpStatus.UNAUTHORIZED);
        }
    }
    async findMatchingSession(token, sessions) {
        for (const session of sessions)
            if (await (0, bcryptjs_1.compare)(token, session.tokenHash))
                return session;
        return null;
    }
    parseDurationMs(value) {
        const match = /^(\d+)([smhd])$/.exec(value);
        if (!match)
            return 30 * 24 * 60 * 60 * 1000;
        const factors = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
        return Number(match[1]) * factors[match[2]];
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(prisma_service_1.PrismaService)),
    __param(1, (0, common_1.Inject)(jwt_1.JwtService)),
    __param(2, (0, common_1.Inject)(config_1.ConfigService)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, jwt_1.JwtService, config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map