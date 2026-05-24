import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { NotificationType, type Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { ERROR_CODES } from '../common/constants/error-codes';
import { AppException } from '../common/exceptions/app.exception';
import type { AuthUser } from '../common/types/auth-user.type';
import { PrismaService } from '../database/prisma.service';
import { QueuesService } from '../jobs/queues.service';
import type { SendNotificationDto } from './dto/notification.dto';
import { EmailProvider } from './providers/email.provider';
import { FcmProvider } from './providers/fcm.provider';
import { SmsProvider } from './providers/sms.provider';

type Tx = Prisma.TransactionClient;

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(QueuesService) private readonly queues: QueuesService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(FcmProvider) private readonly fcm: FcmProvider,
    @Inject(SmsProvider) private readonly sms: SmsProvider,
    @Inject(EmailProvider) private readonly email: EmailProvider,
  ) {}

  listOwn(userId: string) { return this.prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 100 }); }

  async markOwnRead(userId: string, notificationId: string) {
    const row = await this.prisma.notification.findFirst({ where: { id: notificationId, userId } });
    if (!row) throw new AppException(ERROR_CODES.NOTIFICATION_NOT_FOUND, 'Notification not found', HttpStatus.NOT_FOUND);
    if (row.readAt) return row;
    return this.prisma.notification.update({ where: { id: notificationId }, data: { readAt: new Date() } });
  }

  async markAllOwnRead(userId: string) {
    const result = await this.prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
    return { updated: result.count };
  }

  async enqueue(dto: SendNotificationDto, actor?: AuthUser) {
    const notification = await this.prisma.notification.create({ data: { userId: dto.userId, type: dto.type, title: dto.title, body: dto.body, metadata: dto.metadata as Prisma.InputJsonValue | undefined } });
    await this.queues.enqueueNotification(notification.id);
    await this.audit.log({ actorId: actor?.sub, action: 'notifications.enqueue', entityType: 'Notification', entityId: notification.id, newValues: { type: dto.type, title: dto.title } });
    return notification;
  }

  async createOrderStatusNotification(client: Tx, userId: string, orderNumber: string, status: string) {
    const notification = await client.notification.create({ data: { userId, type: NotificationType.IN_APP, title: 'Sipariş durumu güncellendi', body: `${orderNumber} numaralı siparişiniz: ${status}`, metadata: { orderNumber, status } } });
    await this.queues.enqueueNotification(notification.id);
    return notification;
  }

  async process(notificationId: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id: notificationId } });
    if (!notification) return null;
    if (notification.type === NotificationType.PUSH) return this.fcm.send({ userId: notification.userId, title: notification.title, body: notification.body, metadata: notification.metadata as Record<string, unknown> | undefined });
    if (notification.type === NotificationType.SMS) return this.sms.send({ userId: notification.userId, body: notification.body });
    if (notification.type === NotificationType.EMAIL) return this.email.send({ userId: notification.userId, subject: notification.title, body: notification.body });
    return { delivered: true, provider: 'in-app' };
  }
}
