import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { QueueModule } from './queue.module';
import { TimeoutWorkersService } from './timeout-workers.service';

@Module({
  imports: [QueueModule, PaymentsModule, NotificationsModule],
  providers: [TimeoutWorkersService],
})
export class JobsModule {}
