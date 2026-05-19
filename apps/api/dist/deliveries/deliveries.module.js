"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeliveriesModule = void 0;
const common_1 = require("@nestjs/common");
const loyalty_module_1 = require("../loyalty/loyalty.module");
const notifications_module_1 = require("../notifications/notifications.module");
const orders_module_1 = require("../orders/orders.module");
const deliveries_controller_1 = require("./deliveries.controller");
const deliveries_service_1 = require("./deliveries.service");
const delivery_status_service_1 = require("./delivery-status.service");
let DeliveriesModule = class DeliveriesModule {
};
exports.DeliveriesModule = DeliveriesModule;
exports.DeliveriesModule = DeliveriesModule = __decorate([
    (0, common_1.Module)({ imports: [orders_module_1.OrdersModule, loyalty_module_1.LoyaltyModule, notifications_module_1.NotificationsModule], controllers: [deliveries_controller_1.DeliveriesController], providers: [deliveries_service_1.DeliveriesService, delivery_status_service_1.DeliveryStatusService], exports: [deliveries_service_1.DeliveriesService, delivery_status_service_1.DeliveryStatusService] })
], DeliveriesModule);
//# sourceMappingURL=deliveries.module.js.map