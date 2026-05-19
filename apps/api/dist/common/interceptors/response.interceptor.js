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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseInterceptor = void 0;
const common_1 = require("@nestjs/common");
// Reflector must be a value import for Nest `emitDecoratorMetadata` / DI typing on this class.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- runtime class for DI
const core_1 = require("@nestjs/core");
const rxjs_1 = require("rxjs");
const skip_response_envelope_decorator_1 = require("../decorators/skip-response-envelope.decorator");
function isPaginated(data) {
    return typeof data === 'object' && data !== null && 'items' in data && 'meta' in data;
}
let ResponseInterceptor = class ResponseInterceptor {
    reflector;
    constructor(reflector) {
        this.reflector = reflector;
    }
    intercept(context, next) {
        const skip = this.reflector.getAllAndOverride(skip_response_envelope_decorator_1.SKIP_RESPONSE_ENVELOPE_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (skip) {
            return next.handle();
        }
        return next.handle().pipe((0, rxjs_1.map)((data) => isPaginated(data) ? { success: true, data: data.items, meta: data.meta } : { success: true, data }));
    }
};
exports.ResponseInterceptor = ResponseInterceptor;
exports.ResponseInterceptor = ResponseInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], ResponseInterceptor);
//# sourceMappingURL=response.interceptor.js.map