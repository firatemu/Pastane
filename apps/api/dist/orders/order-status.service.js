"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderStatusService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const app_exception_1 = require("../common/exceptions/app.exception");
const error_codes_1 = require("../common/constants/error-codes");
/**
 * Admin/manual order status changes. Ödeme başarılı olunca CONFIRMED geçişi ödeme servisinde yapılır;
 * bu yüzden PAYMENT_PENDING → CONFIRMED burada listede yoktur.
 */
let OrderStatusService = class OrderStatusService {
    transitions = {
        NEW: [client_1.OrderStatus.PAYMENT_PENDING],
        PAYMENT_PENDING: [client_1.OrderStatus.CANCELLED],
        CONFIRMED: [client_1.OrderStatus.PREPARING, client_1.OrderStatus.CANCELLED],
        PREPARING: [client_1.OrderStatus.READY],
        READY: [client_1.OrderStatus.ASSIGNED_TO_COURIER, client_1.OrderStatus.DELIVERED],
        ASSIGNED_TO_COURIER: [client_1.OrderStatus.OUT_FOR_DELIVERY],
        OUT_FOR_DELIVERY: [client_1.OrderStatus.DELIVERED, client_1.OrderStatus.CANCELLED],
        DELIVERED: [client_1.OrderStatus.CANCELLED],
        CANCELLED: [],
    };
    assert(from, to) {
        if (!this.transitions[from].includes(to)) {
            throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.ORDER_STATUS_TRANSITION_INVALID, 'Invalid order status transition', common_1.HttpStatus.BAD_REQUEST);
        }
    }
};
exports.OrderStatusService = OrderStatusService;
exports.OrderStatusService = OrderStatusService = __decorate([
    (0, common_1.Injectable)()
], OrderStatusService);
//# sourceMappingURL=order-status.service.js.map