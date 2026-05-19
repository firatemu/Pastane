"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const public_decorator_1 = require("../common/decorators/public.decorator");
const rate_limit_decorator_1 = require("../common/decorators/rate-limit.decorator");
const skip_response_envelope_decorator_1 = require("../common/decorators/skip-response-envelope.decorator");
const checkout_form_init_dto_1 = require("./dto/checkout-form-init.dto");
const initiate_payment_dto_1 = require("./dto/initiate-payment.dto");
const payment_callback_dto_1 = require("./dto/payment-callback.dto");
const payments_service_1 = require("./payments.service");
let PaymentsController = class PaymentsController {
    service;
    constructor(service) {
        this.service = service;
    }
    initiate(user, dto, key) {
        return this.service.initiate(user.sub, dto, key ?? `${user.sub}:${dto.orderId}`);
    }
    initCheckoutForm(user, dto, key) {
        return this.service.initiateCheckoutForm(user.sub, dto.orderId, key ?? `${user.sub}:${dto.orderId}:iyzico-cf`);
    }
    async iyzicoCheckoutFormReturn(req, res) {
        let token = typeof req.body?.token === 'string' ? req.body.token : undefined;
        const q = req.query;
        if (!token && typeof q.token === 'string')
            token = q.token;
        const url = await this.service.finalizeCheckoutFormReturnRedirectUrl(token);
        res.redirect(302, url);
    }
    callback(dto) {
        return this.service.callback(dto, dto);
    }
    get(user, orderId) {
        return this.service.findOwn(user.sub, orderId);
    }
};
exports.PaymentsController = PaymentsController;
__decorate([
    (0, rate_limit_decorator_1.RateLimit)({ points: 8, durationSeconds: 60 }),
    (0, swagger_1.ApiBody)({ type: initiate_payment_dto_1.InitiatePaymentDto }),
    (0, common_1.Post)('initiate'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)('idempotency-key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, initiate_payment_dto_1.InitiatePaymentDto, String]),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "initiate", null);
__decorate([
    (0, rate_limit_decorator_1.RateLimit)({ points: 8, durationSeconds: 60 }),
    (0, swagger_1.ApiBody)({ type: checkout_form_init_dto_1.CheckoutFormInitDto }),
    (0, common_1.Post)('checkout-form-init'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)('idempotency-key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, checkout_form_init_dto_1.CheckoutFormInitDto, String]),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "initCheckoutForm", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, skip_response_envelope_decorator_1.SkipResponseEnvelope)(),
    (0, rate_limit_decorator_1.RateLimit)({ points: 60, durationSeconds: 60 }),
    (0, common_1.All)('iyzico/form-return'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "iyzicoCheckoutFormReturn", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, rate_limit_decorator_1.RateLimit)({ points: 60, durationSeconds: 60 }),
    (0, swagger_1.ApiBody)({ type: payment_callback_dto_1.PaymentCallbackDto }),
    (0, common_1.Post)('callback'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [payment_callback_dto_1.PaymentCallbackDto]),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "callback", null);
__decorate([
    (0, common_1.Get)(':orderId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('orderId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "get", null);
exports.PaymentsController = PaymentsController = __decorate([
    (0, common_1.Controller)('payments'),
    __param(0, (0, common_1.Inject)(payments_service_1.PaymentsService)),
    __metadata("design:paramtypes", [payments_service_1.PaymentsService])
], PaymentsController);
//# sourceMappingURL=payments.controller.js.map