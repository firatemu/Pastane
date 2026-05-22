import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AllergensModule } from './allergens/allergens.module';
import { RateLimitGuard } from './common/guards/rate-limit.guard';
import { SettingsModule } from './settings/settings.module';
import { NotificationsModule } from './notifications/notifications.module';
import { LoyaltyModule } from './loyalty/loyalty.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { BannersModule } from './banners/banners.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { CartModule } from './cart/cart.module';
import { CategoriesModule } from './categories/categories.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { PrismaModule } from './database/prisma.module';
import { DeliveryZonesModule } from './delivery-zones/delivery-zones.module';
import { DeliveriesModule } from './deliveries/deliveries.module';
import { HealthModule } from './health/health.module';
import { JobsModule } from './jobs/jobs.module';
import { MediaModule } from './media/media.module';
import { OrdersModule } from './orders/orders.module';
import { OtpModule } from './otp/otp.module';
import { PaymentsModule } from './payments/payments.module';
import { PermissionsModule } from './permissions/permissions.module';
import { ProductsModule } from './products/products.module';
import { RolesModule } from './roles/roles.module';
import { StoresModule } from './stores/stores.module';
import { UsersModule } from './users/users.module';
import { CouriersModule } from './couriers/couriers.module';
import { ReviewsModule } from './reviews/reviews.module';
import { ReportsModule } from './reports/reports.module';
import { AddressesModule } from './addresses/addresses.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Turborepo / Docker: API cwd is often `apps/api`; repo-root `.env` still applies for local dev & compose `env_file`.
      envFilePath: ['.env.local', '.env', '../.env', '../../.env'],
    }), PrismaModule, AuditModule, AuthModule, OtpModule, UsersModule,
    RolesModule, PermissionsModule, CategoriesModule, ProductsModule, AllergensModule, MediaModule,
    StoresModule, DeliveryZonesModule, CartModule, OrdersModule, PaymentsModule,
    CouriersModule, DeliveriesModule, AddressesModule, ReviewsModule, LoyaltyModule, NotificationsModule, CampaignsModule, BannersModule, SettingsModule, ReportsModule, JobsModule, HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
