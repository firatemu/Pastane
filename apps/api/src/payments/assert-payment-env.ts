import type { ConfigService } from '@nestjs/config';

/** Message must stay in sync across bootstrap guards. */
export const PAYMENT_DEV_FORBIDDEN_IN_PRODUCTION =
  '[CRITICAL] PAYMENT_DEV_AUTO_SUCCESS is true in production. Shutting down.';

/** Returns true only when PAYMENT_DEV_AUTO_SUCCESS is explicitly "true" (env overrides config). */
function readPaymentDevRaw(config?: ConfigService): string | undefined {
  const env = process.env.PAYMENT_DEV_AUTO_SUCCESS?.trim();
  if (env !== undefined && env !== '') return env;
  return config?.get<string>('PAYMENT_DEV_AUTO_SUCCESS')?.trim();
}

/** Before Nest bootstrap (no Nest Config yet). */
export function assertForbiddenPaymentDevAutoSuccessBootstrap(): void {
  if (process.env.NODE_ENV === 'production' && process.env.PAYMENT_DEV_AUTO_SUCCESS === 'true') {
    throw new Error(PAYMENT_DEV_FORBIDDEN_IN_PRODUCTION);
  }
}

/**
 * After Nest ConfigModule load: production must never enable dev-payment bypass (env OR config resolved value).
 */
export function assertForbiddenPaymentDevAutoSuccessWithConfig(config: ConfigService): void {
  if (process.env.NODE_ENV !== 'production') return;
  const raw = readPaymentDevRaw(config);
  if (raw === 'true') {
    throw new Error(PAYMENT_DEV_FORBIDDEN_IN_PRODUCTION);
  }
}
