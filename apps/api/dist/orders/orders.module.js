"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersModule = void 0;
const common_1 = require("@nestjs/common");
const queue_module_1 = require("../jobs/queue.module");
const loyalty_module_1 = require("../loyalty/loyalty.module");
const notifications_module_1 = require("../notifications/notifications.module");
const stock_reservations_module_1 = require("../stock-reservations/stock-reservations.module");
const order_status_service_1 = require("./order-status.service");
const orders_controller_1 = require("./orders.controller");
const orders_service_1 = require("./orders.service");
let OrdersModule = class OrdersModule {
};
exports.OrdersModule = OrdersModule;
exports.OrdersModule = OrdersModule = __decorate([
    (0, common_1.Module)({
        imports: [stock_reservations_module_1.StockReservationsModule, queue_module_1.QueueModule, loyalty_module_1.LoyaltyModule, notifications_module_1.NotificationsModule],
        controllers: [orders_controller_1.OrdersController],
        providers: [orders_service_1.OrdersService, order_status_service_1.OrderStatusService],
        exports: [orders_service_1.OrdersService, order_status_service_1.OrderStatusService],
    })
], OrdersModule);
//# sourceMappingURL=orders.module.js.map