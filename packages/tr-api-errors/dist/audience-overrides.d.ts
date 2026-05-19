import type { ApiAudience } from './types';
/** Customer web: friendlier / storefront-specific wording where it differs from admin core. */
export declare const CUSTOMER_OVERRIDES: Partial<Record<string, string>>;
/** Courier app: short, field-oriented copy. */
export declare const COURIER_OVERRIDES: Partial<Record<string, string>>;
export declare function messageForCode(code: string, audience: ApiAudience): string | undefined;
//# sourceMappingURL=audience-overrides.d.ts.map