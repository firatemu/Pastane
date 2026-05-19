import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rateLimit';
export interface RateLimitOptions { points: number; durationSeconds: number }
export const RateLimit = (options: RateLimitOptions): ReturnType<typeof SetMetadata> => SetMetadata(RATE_LIMIT_KEY, options);
