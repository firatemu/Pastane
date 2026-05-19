import { Module } from '@nestjs/common';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrdersModule } from '../orders/orders.module';
import { DeliveriesController } from './deliveries.controller';
import { DeliveriesService } from './deliveries.service';
import { DeliveryStatusService } from './delivery-status.service';

@Module({ imports: [OrdersModule, LoyaltyModule, NotificationsModule], controllers: [DeliveriesController], providers: [DeliveriesService, DeliveryStatusService], exports: [DeliveriesService, DeliveryStatusService] })
export class DeliveriesModule {}
