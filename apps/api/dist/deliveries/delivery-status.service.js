"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeliveryStatusService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const error_codes_1 = require("../common/constants/error-codes");
const app_exception_1 = require("../common/exceptions/app.exception");
let DeliveryStatusService = class DeliveryStatusService {
    transitions = {
        ASSIGNED: [client_1.DeliveryStatus.PICKED_UP],
        PICKED_UP: [client_1.DeliveryStatus.OUT_FOR_DELIVERY, client_1.DeliveryStatus.DELIVERED, client_1.DeliveryStatus.FAILED],
        OUT_FOR_DELIVERY: [client_1.DeliveryStatus.DELIVERED, client_1.DeliveryStatus.FAILED],
        DELIVERED: [],
        FAILED: [],
    };
    assert(from, to) { if (!this.transitions[from].includes(to))
        throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.DELIVERY_STATUS_TRANSITION_INVALID, 'Invalid delivery status transition', common_1.HttpStatus.BAD_REQUEST); }
};
exports.DeliveryStatusService = DeliveryStatusService;
exports.DeliveryStatusService = DeliveryStatusService = __decorate([
    (0, common_1.Injectable)()
], DeliveryStatusService);
//# sourceMappingURL=delivery-status.service.js.map