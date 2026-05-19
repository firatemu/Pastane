import { Module } from '@nestjs/common';
import { QueueModule } from '../jobs/queue.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrdersModule } from '../orders/orders.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { IyzicoProvider } from './providers/iyzico.provider';

@Module({
  imports: [OrdersModule, QueueModule, NotificationsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, IyzicoProvider],
  exports: [PaymentsService],
})
export class PaymentsModule {}
