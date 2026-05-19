import { Module } from '@nestjs/common';
import { QueueModule } from '../jobs/queue.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { StockReservationsModule } from '../stock-reservations/stock-reservations.module';
import { OrderStatusService } from './order-status.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [StockReservationsModule, QueueModule, LoyaltyModule, NotificationsModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrderStatusService],
  exports: [OrdersService, OrderStatusService],
})
export class OrdersModule {}
