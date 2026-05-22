import { Inject, Injectable, Logger } from '@nestjs/common';
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker } from 'bullmq';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentsService } from '../payments/payments.service';

@Injectable()
export class TimeoutWorkersService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TimeoutWorkersService.name);
  private workers: Worker[] = [];
  constructor(@Inject(ConfigService) private readonly config: ConfigService, @Inject(PaymentsService) private readonly payments: PaymentsService, @Inject(NotificationsService) private readonly notifications: NotificationsService) {}
  onModuleInit() {
    const connection = { host: this.config.get('REDIS_HOST', 'localhost'), port: Number(this.config.get('REDIS_PORT', 6379)), password: this.config.get('REDIS_PASSWORD') };
    this.workers = [
      new Worker('payments', (job) => this.payments.timeout(job.data.paymentId), { connection }),
      new Worker('notifications', (job) => this.notifications.process(job.data.notificationId), { connection }),
    ];
    for (const worker of this.workers) worker.on('failed', (job, error) => this.logger.warn(`Queue job failed: ${job?.name ?? 'unknown'} ${error.message}`));
  }
  async onModuleDestroy() { await Promise.all(this.workers.map((worker) => worker.close())); }
}
