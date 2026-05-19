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
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const audit_service_1 = require("../audit/audit.service");
const prisma_service_1 = require("../database/prisma.service");
const queues_service_1 = require("../jobs/queues.service");
const email_provider_1 = require("./providers/email.provider");
const fcm_provider_1 = require("./providers/fcm.provider");
const sms_provider_1 = require("./providers/sms.provider");
let NotificationsService = class NotificationsService {
    prisma;
    queues;
    audit;
    fcm;
    sms;
    email;
    constructor(prisma, queues, audit, fcm, sms, email) {
        this.prisma = prisma;
        this.queues = queues;
        this.audit = audit;
        this.fcm = fcm;
        this.sms = sms;
        this.email = email;
    }
    listOwn(userId) { return this.prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 100 }); }
    async enqueue(dto, actor) {
        const notification = await this.prisma.notification.create({ data: { userId: dto.userId, type: dto.type, title: dto.title, body: dto.body, metadata: dto.metadata } });
        await this.queues.enqueueNotification(notification.id);
        await this.audit.log({ actorId: actor?.sub, action: 'notifications.enqueue', entityType: 'Notification', entityId: notification.id, newValues: { type: dto.type, title: dto.title } });
        return notification;
    }
    async createOrderStatusNotification(client, userId, orderNumber, status) {
        const notification = await client.notification.create({ data: { userId, type: client_1.NotificationType.IN_APP, title: 'Sipariş durumu güncellendi', body: `${orderNumber} numaralı siparişiniz: ${status}`, metadata: { orderNumber, status } } });
        await this.queues.enqueueNotification(notification.id);
        return notification;
    }
    async process(notificationId) {
        const notification = await this.prisma.notification.findUnique({ where: { id: notificationId } });
        if (!notification)
            return null;
        if (notification.type === client_1.NotificationType.PUSH)
            return this.fcm.send({ userId: notification.userId, title: notification.title, body: notification.body, metadata: notification.metadata });
        if (notification.type === client_1.NotificationType.SMS)
            return this.sms.send({ userId: notification.userId, body: notification.body });
        if (notification.type === client_1.NotificationType.EMAIL)
            return this.email.send({ userId: notification.userId, subject: notification.title, body: notification.body });
        return { delivered: true, provider: 'in-app' };
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(prisma_service_1.PrismaService)),
    __param(1, (0, common_1.Inject)(queues_service_1.QueuesService)),
    __param(2, (0, common_1.Inject)(audit_service_1.AuditService)),
    __param(3, (0, common_1.Inject)(fcm_provider_1.FcmProvider)),
    __param(4, (0, common_1.Inject)(sms_provider_1.SmsProvider)),
    __param(5, (0, common_1.Inject)(email_provider_1.EmailProvider)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        queues_service_1.QueuesService,
        audit_service_1.AuditService,
        fcm_provider_1.FcmProvider,
        sms_provider_1.SmsProvider,
        email_provider_1.EmailProvider])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map