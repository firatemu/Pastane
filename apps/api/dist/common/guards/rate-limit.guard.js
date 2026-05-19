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
exports.RateLimitGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const rate_limit_decorator_1 = require("../decorators/rate-limit.decorator");
const app_exception_1 = require("../exceptions/app.exception");
let RateLimitGuard = class RateLimitGuard {
    reflector;
    buckets = new Map();
    constructor(reflector) {
        this.reflector = reflector;
    }
    canActivate(context) {
        const options = this.reflector.getAllAndOverride(rate_limit_decorator_1.RATE_LIMIT_KEY, [context.getHandler(), context.getClass()]);
        if (!options)
            return true;
        const req = context.switchToHttp().getRequest();
        const forwarded = req.headers['x-forwarded-for'];
        const forwardedIp = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0]?.trim();
        const ip = forwardedIp || req.ip || 'unknown';
        const route = req.route?.path ?? req.path ?? 'unknown';
        const key = `${ip}:${route}`;
        const now = Date.now();
        const current = this.buckets.get(key);
        if (!current || current.resetAt <= now) {
            this.buckets.set(key, { count: 1, resetAt: now + options.durationSeconds * 1000 });
            return true;
        }
        if (current.count >= options.points)
            throw new app_exception_1.AppException('RATE_LIMIT_EXCEEDED', 'Too many requests', common_1.HttpStatus.TOO_MANY_REQUESTS);
        current.count += 1;
        return true;
    }
};
exports.RateLimitGuard = RateLimitGuard;
exports.RateLimitGuard = RateLimitGuard = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(core_1.Reflector)),
    __metadata("design:paramtypes", [core_1.Reflector])
], RateLimitGuard);
//# sourceMappingURL=rate-limit.guard.js.map