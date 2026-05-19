"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const error_codes_1 = require("../constants/error-codes");
let HttpExceptionFilter = class HttpExceptionFilter {
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const status = exception instanceof common_1.HttpException ? exception.getStatus() : common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        const payload = exception instanceof common_1.HttpException ? exception.getResponse() : undefined;
        const objectPayload = typeof payload === 'object' && payload !== null ? payload : {};
        const message = typeof objectPayload.message === 'string'
            ? objectPayload.message
            : Array.isArray(objectPayload.message)
                ? 'Validation failed'
                : status === 500
                    ? 'Internal server error'
                    : String(payload ?? 'Request failed');
        const code = typeof objectPayload.code === 'string'
            ? objectPayload.code
            : status === 400
                ? error_codes_1.ERROR_CODES.VALIDATION_FAILED
                : status === 403
                    ? error_codes_1.ERROR_CODES.FORBIDDEN
                    : status === 500
                        ? error_codes_1.ERROR_CODES.INTERNAL_SERVER_ERROR
                        : `HTTP_${status}`;
        const detailsForLog = objectPayload.details ?? (Array.isArray(objectPayload.message) ? objectPayload.message : undefined);
        // #region agent log
        if (status === 400 && request.url.includes('/addresses')) {
            void fetch('http://127.0.0.1:7512/ingest/11bfe911-4ca5-4444-935d-41d79a3e86de', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '43722c' },
                body: JSON.stringify({
                    sessionId: '43722c',
                    location: 'http-exception.filter.ts:catch',
                    message: 'API 400 on addresses',
                    hypothesisId: 'H1-H4',
                    data: {
                        url: request.url,
                        method: request.method,
                        code,
                        errMsg: String(message).slice(0, 200),
                        detailsPreview: detailsForLog ? JSON.stringify(detailsForLog).slice(0, 600) : undefined,
                    },
                    timestamp: Date.now(),
                }),
            }).catch(() => { });
        }
        // #endregion
        response.status(status).json({
            success: false,
            error: {
                code,
                message,
                details: objectPayload.details ?? (Array.isArray(objectPayload.message) ? objectPayload.message : undefined),
            },
            meta: {
                path: request.url,
                timestamp: new Date().toISOString(),
            },
        });
    }
};
exports.HttpExceptionFilter = HttpExceptionFilter;
exports.HttpExceptionFilter = HttpExceptionFilter = __decorate([
    (0, common_1.Catch)()
], HttpExceptionFilter);
//# sourceMappingURL=http-exception.filter.js.map