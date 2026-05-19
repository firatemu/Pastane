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
exports.QueuesService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const bullmq_1 = require("bullmq");
let QueuesService = class QueuesService {
    config;
    payments;
    stock;
    notifications;
    constructor(config) {
        this.config = config;
        const connection = {
            host: this.config.get('REDIS_HOST', 'localhost'),
            port: Number(this.config.get('REDIS_PORT', 6379)),
            password: this.config.get('REDIS_PASSWORD'),
        };
        this.payments = new bullmq_1.Queue('payments', { connection });
        this.stock = new bullmq_1.Queue('stock', { connection });
        this.notifications = new bullmq_1.Queue('notifications', { connection });
    }
    async schedulePaymentTimeout(paymentId) {
        try {
            await this.payments.add('payment-timeout', { paymentId }, {
                jobId: `payment-timeout:${paymentId}`,
                delay: Number(this.config.get('PAYMENT_TIMEOUT_MS', 10 * 60 * 1000)),
                removeOnComplete: true,
            });
            return true;
        }
        catch {
            return false;
        }
    }
    async scheduleStockTimeout(orderId) {
        try {
            await this.stock.add('stock-reservation-timeout', { orderId }, {
                jobId: `stock-timeout:${orderId}`,
                delay: Number(this.config.get('STOCK_RESERVATION_TIMEOUT_MS', 10 * 60 * 1000)),
                removeOnComplete: true,
            });
            return true;
        }
        catch {
            return false;
        }
    }
    async enqueueNotification(notificationId) {
        try {
            await this.notifications.add('notification-send', { notificationId }, {
                jobId: `notification:${notificationId}`,
                attempts: 3,
                backoff: { type: 'exponential', delay: 5000 },
                removeOnComplete: true,
            });
            return true;
        }
        catch {
            return false;
        }
    }
    async onModuleDestroy() {
        await Promise.all([this.payments.close(), this.stock.close(), this.notifications.close()]);
    }
};
exports.QueuesService = QueuesService;
exports.QueuesService = QueuesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(config_1.ConfigService)),
    __metadata("design:paramtypes", [config_1.ConfigService])
], QueuesService);
//# sourceMappingURL=queues.service.js.map