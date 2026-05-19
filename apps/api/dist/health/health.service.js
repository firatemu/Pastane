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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ioredis_1 = __importDefault(require("ioredis"));
const minio_1 = require("minio");
const prisma_service_1 = require("../database/prisma.service");
let HealthService = class HealthService {
    prisma;
    config;
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
    }
    async getStatus() {
        const [postgres, redis, minio] = await Promise.all([this.checkPostgres(), this.checkRedis(), this.checkMinio()]);
        return { status: postgres && redis && minio ? 'ok' : 'degraded', services: { postgres, redis, minio } };
    }
    async checkPostgres() { try {
        await this.prisma.$queryRaw `SELECT 1`;
        return true;
    }
    catch {
        return false;
    } }
    async checkRedis() { const redis = new ioredis_1.default({ host: this.config.get('REDIS_HOST', 'localhost'), port: Number(this.config.get('REDIS_PORT', 6379)), password: this.config.get('REDIS_PASSWORD') }); try {
        return await redis.ping() === 'PONG';
    }
    catch {
        return false;
    }
    finally {
        redis.disconnect();
    } }
    async checkMinio() { const client = new minio_1.Client({ endPoint: this.config.get('MINIO_ENDPOINT', 'localhost'), port: Number(this.config.get('MINIO_PORT', 9000)), useSSL: this.config.get('MINIO_USE_SSL', 'false') === 'true', accessKey: this.config.getOrThrow('MINIO_ACCESS_KEY'), secretKey: this.config.getOrThrow('MINIO_SECRET_KEY') }); try {
        await client.listBuckets();
        return true;
    }
    catch {
        return false;
    } }
};
exports.HealthService = HealthService;
exports.HealthService = HealthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(prisma_service_1.PrismaService)),
    __param(1, (0, common_1.Inject)(config_1.ConfigService)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, config_1.ConfigService])
], HealthService);
//# sourceMappingURL=health.service.js.map