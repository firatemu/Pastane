"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const allergens_module_1 = require("./allergens/allergens.module");
const rate_limit_guard_1 = require("./common/guards/rate-limit.guard");
const settings_module_1 = require("./settings/settings.module");
const notifications_module_1 = require("./notifications/notifications.module");
const loyalty_module_1 = require("./loyalty/loyalty.module");
const campaigns_module_1 = require("./campaigns/campaigns.module");
const banners_module_1 = require("./banners/banners.module");
const audit_module_1 = require("./audit/audit.module");
const auth_module_1 = require("./auth/auth.module");
const cart_module_1 = require("./cart/cart.module");
const categories_module_1 = require("./categories/categories.module");
const jwt_auth_guard_1 = require("./common/guards/jwt-auth.guard");
const permissions_guard_1 = require("./common/guards/permissions.guard");
const roles_guard_1 = require("./common/guards/roles.guard");
const prisma_module_1 = require("./database/prisma.module");
const delivery_zones_module_1 = require("./delivery-zones/delivery-zones.module");
const deliveries_module_1 = require("./deliveries/deliveries.module");
const health_module_1 = require("./health/health.module");
const jobs_module_1 = require("./jobs/jobs.module");
const media_module_1 = require("./media/media.module");
const orders_module_1 = require("./orders/orders.module");
const otp_module_1 = require("./otp/otp.module");
const payments_module_1 = require("./payments/payments.module");
const permissions_module_1 = require("./permissions/permissions.module");
const products_module_1 = require("./products/products.module");
const roles_module_1 = require("./roles/roles.module");
const stock_module_1 = require("./stock/stock.module");
const stock_reservations_module_1 = require("./stock-reservations/stock-reservations.module");
const stores_module_1 = require("./stores/stores.module");
const users_module_1 = require("./users/users.module");
const couriers_module_1 = require("./couriers/couriers.module");
const reviews_module_1 = require("./reviews/reviews.module");
const reports_module_1 = require("./reports/reports.module");
const addresses_module_1 = require("./addresses/addresses.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                // Turborepo / Docker: API cwd is often `apps/api`; repo-root `.env` still applies for local dev & compose `env_file`.
                envFilePath: ['.env.local', '.env', '../.env', '../../.env'],
            }), prisma_module_1.PrismaModule, audit_module_1.AuditModule, auth_module_1.AuthModule, otp_module_1.OtpModule, users_module_1.UsersModule,
            roles_module_1.RolesModule, permissions_module_1.PermissionsModule, categories_module_1.CategoriesModule, products_module_1.ProductsModule, allergens_module_1.AllergensModule, media_module_1.MediaModule,
            stock_module_1.StockModule, stores_module_1.StoresModule, delivery_zones_module_1.DeliveryZonesModule, cart_module_1.CartModule, orders_module_1.OrdersModule, payments_module_1.PaymentsModule,
            stock_reservations_module_1.StockReservationsModule, couriers_module_1.CouriersModule, deliveries_module_1.DeliveriesModule, addresses_module_1.AddressesModule, reviews_module_1.ReviewsModule, loyalty_module_1.LoyaltyModule, notifications_module_1.NotificationsModule, campaigns_module_1.CampaignsModule, banners_module_1.BannersModule, settings_module_1.SettingsModule, reports_module_1.ReportsModule, jobs_module_1.JobsModule, health_module_1.HealthModule,
        ],
        providers: [
            { provide: core_1.APP_GUARD, useClass: rate_limit_guard_1.RateLimitGuard },
            { provide: core_1.APP_GUARD, useClass: jwt_auth_guard_1.JwtAuthGuard },
            { provide: core_1.APP_GUARD, useClass: roles_guard_1.RolesGuard },
            { provide: core_1.APP_GUARD, useClass: permissions_guard_1.PermissionsGuard },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map