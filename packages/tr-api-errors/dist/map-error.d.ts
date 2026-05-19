import type { ApiAudience, ApiErrorShape } from './types';
export declare const DEFAULT_ERROR: Record<ApiAudience, string>;
export declare function looksLikeGenericEnglish(message: string): boolean;
/** Use non-English constraint lines from Nest `error.details` when present (class-validator, etc.). */
export declare function validationDetailsUserHint(details: unknown): string | null;
/**
 * Map Nest/BFF `error` shape + HTTP status to a single Turkish UI string.
 */
export declare function mapApiErrorToTurkish(audience: ApiAudience, status: number, error: ApiErrorShape | undefined, contextualFallback?: string): string;
/**
 * Map thrown client/network errors (e.g. `fetch` failures) to Turkish UI copy.
 */
export declare function mapUnknownErrorToTurkish(audience: ApiAudience, error: unknown, contextualFallback?: string): string;
export declare function mapPayloadToTurkish(audience: ApiAudience, status: number, payload: {
    message?: string;
    error?: ApiErrorShape;
} | null | undefined, contextualFallback: string): string;
//# sourceMappingURL=map-error.d.ts.map