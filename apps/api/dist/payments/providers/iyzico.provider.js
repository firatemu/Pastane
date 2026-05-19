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
exports.IyzicoProvider = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const config_1 = require("@nestjs/config");
const app_exception_1 = require("../../common/exceptions/app.exception");
const error_codes_1 = require("../../common/constants/error-codes");
/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any -- iyzipay ships untyped CommonJS */
const IyzipayLib = require('iyzipay');
let IyzicoProvider = class IyzicoProvider {
    config;
    client;
    constructor(config) {
        this.config = config;
        const apiKey = this.config.get('IYZICO_API_KEY') ?? process.env.IYZICO_API_KEY;
        const secretKey = this.config.get('IYZICO_SECRET_KEY') ?? process.env.IYZICO_SECRET_KEY;
        const uri = this.config.get('IYZICO_BASE_URL') ?? process.env.IYZICO_BASE_URL;
        if (apiKey && secretKey && uri) {
            this.client = new IyzipayLib({ apiKey, secretKey, uri });
        }
        else {
            this.client = null;
        }
    }
    isCheckoutConfigured() {
        return this.client !== null;
    }
    assertCheckoutConfigured() {
        if (!this.client) {
            throw new app_exception_1.AppException(error_codes_1.ERROR_CODES.INTERNAL_SERVER_ERROR, 'iyzico is not configured (IYZICO_API_KEY, IYZICO_SECRET_KEY, IYZICO_BASE_URL)', common_1.HttpStatus.SERVICE_UNAVAILABLE);
        }
    }
    async initiate(_dto, conversationId) {
        return {
            providerPaymentId: `sandbox-${(0, crypto_1.randomUUID)()}`,
            conversationId,
            redirectUrl: 'https://sandbox.example.test/pay',
        };
    }
    async checkoutFormInitialize(request) {
        this.assertCheckoutConfigured();
        return new Promise((resolve, reject) => {
            this.client.checkoutFormInitialize.create(request, (err, result) => {
                if (err)
                    reject(err);
                else
                    resolve(result);
            });
        });
    }
    async checkoutFormRetrieve(body) {
        this.assertCheckoutConfigured();
        return new Promise((resolve, reject) => {
            this.client.checkoutForm.retrieve(body, (err, result) => {
                if (err)
                    reject(err);
                else
                    resolve(result);
            });
        });
    }
    verifyCallback(payload) {
        void payload;
        return true;
    }
    sanitize(payload) {
        const { cardNumber, cvc, cvv, ...safe } = payload;
        void cardNumber;
        void cvc;
        void cvv;
        return safe;
    }
};
exports.IyzicoProvider = IyzicoProvider;
exports.IyzicoProvider = IyzicoProvider = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(config_1.ConfigService)),
    __metadata("design:paramtypes", [config_1.ConfigService])
], IyzicoProvider);
//# sourceMappingURL=iyzico.provider.js.map