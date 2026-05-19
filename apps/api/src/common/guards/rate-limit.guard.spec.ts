import type { ExecutionContext } from '@nestjs/common';
import { RateLimitGuard } from './rate-limit.guard';

describe('RateLimitGuard', () => {
  it('rejects requests over the configured bucket limit', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue({ points: 1, durationSeconds: 60 }) };
    const guard = new RateLimitGuard(reflector as never);
    const context = { getHandler: jest.fn(), getClass: jest.fn(), switchToHttp: () => ({ getRequest: () => ({ ip: '127.0.0.1', headers: {}, path: '/auth/login' }) }) } as unknown as ExecutionContext;
    expect(guard.canActivate(context)).toBe(true);
    expect(() => guard.canActivate(context)).toThrow('Too many requests');
  });
});
