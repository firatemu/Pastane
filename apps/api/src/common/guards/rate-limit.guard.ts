import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RATE_LIMIT_KEY, type RateLimitOptions } from '../decorators/rate-limit.decorator';
import { AppException } from '../exceptions/app.exception';

interface Bucket { count: number; resetAt: number }

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, Bucket>();
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [context.getHandler(), context.getClass()]);
    if (!options) return true;
    const req = context.switchToHttp().getRequest<{ ip?: string; headers: Record<string, string | string[] | undefined>; route?: { path?: string }; path?: string }>();
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
    if (current.count >= options.points) throw new AppException('RATE_LIMIT_EXCEEDED', 'Too many requests', HttpStatus.TOO_MANY_REQUESTS);
    current.count += 1;
    return true;
  }
}
