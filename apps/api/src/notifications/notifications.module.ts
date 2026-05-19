import { Module } from '@nestjs/common';
import { QueueModule } from '../jobs/queue.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { EmailProvider } from './providers/email.provider';
import { FcmProvider } from './providers/fcm.provider';
import { SmsProvider } from './providers/sms.provider';

@Module({ imports: [QueueModule], controllers: [NotificationsController], providers: [NotificationsService, FcmProvider, SmsProvider, EmailProvider], exports: [NotificationsService] })
export class NotificationsModule {}
