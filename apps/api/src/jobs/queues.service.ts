import { Inject, Injectable } from '@nestjs/common';
import type { OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';

@Injectable()
export class QueuesService implements OnModuleDestroy {
  readonly payments: Queue;
  readonly notifications: Queue;

  constructor(@Inject(ConfigService) private readonly config: ConfigService) {
    const connection = {
      host: this.config.get('REDIS_HOST', 'localhost'),
      port: Number(this.config.get('REDIS_PORT', 6379)),
      password: this.config.get('REDIS_PASSWORD'),
    };
    this.payments = new Queue('payments', { connection });
    this.notifications = new Queue('notifications', { connection });
  }

  async schedulePaymentTimeout(paymentId: string): Promise<boolean> {
    try {
      await this.payments.add('payment-timeout', { paymentId }, {
        jobId: `payment-timeout:${paymentId}`,
        delay: Number(this.config.get('PAYMENT_TIMEOUT_MS', 10 * 60 * 1000)),
        removeOnComplete: true,
      });
      return true;
    } catch {
      return false;
    }
  }

  async enqueueNotification(notificationId: string): Promise<boolean> {
    try {
      await this.notifications.add('notification-send', { notificationId }, {
        jobId: `notification:${notificationId}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
      });
      return true;
    } catch {
      return false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([this.payments.close(), this.notifications.close()]);
  }
}
