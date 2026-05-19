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
var TimeoutWorkersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeoutWorkersService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const bullmq_1 = require("bullmq");
const notifications_service_1 = require("../notifications/notifications.service");
const payments_service_1 = require("../payments/payments.service");
let TimeoutWorkersService = TimeoutWorkersService_1 = class TimeoutWorkersService {
    config;
    payments;
    notifications;
    logger = new common_1.Logger(TimeoutWorkersService_1.name);
    workers = [];
    constructor(config, payments, notifications) {
        this.config = config;
        this.payments = payments;
        this.notifications = notifications;
    }
    onModuleInit() {
        const connection = { host: this.config.get('REDIS_HOST', 'localhost'), port: Number(this.config.get('REDIS_PORT', 6379)), password: this.config.get('REDIS_PASSWORD') };
        this.workers = [
            new bullmq_1.Worker('payments', (job) => this.payments.timeout(job.data.paymentId), { connection }),
            new bullmq_1.Worker('stock', (job) => this.payments.expireReservation(job.data.orderId), { connection }),
            new bullmq_1.Worker('notifications', (job) => this.notifications.process(job.data.notificationId), { connection }),
        ];
        for (const worker of this.workers)
            worker.on('failed', (job, error) => this.logger.warn(`Queue job failed: ${job?.name ?? 'unknown'} ${error.message}`));
    }
    async onModuleDestroy() { await Promise.all(this.workers.map((worker) => worker.close())); }
};
exports.TimeoutWorkersService = TimeoutWorkersService;
exports.TimeoutWorkersService = TimeoutWorkersService = TimeoutWorkersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(config_1.ConfigService)),
    __param(1, (0, common_1.Inject)(payments_service_1.PaymentsService)),
    __param(2, (0, common_1.Inject)(notifications_service_1.NotificationsService)),
    __metadata("design:paramtypes", [config_1.ConfigService, payments_service_1.PaymentsService, notifications_service_1.NotificationsService])
], TimeoutWorkersService);
//# sourceMappingURL=timeout-workers.service.js.map