/**
 * Maps Nest API envelopes and common English phrases to Turkish copy for the customer storefront.
 * Shared logic lives in `@pastane/tr-api-errors`; this module keeps stable import paths for the web app.
 */

import type { ApiErrorShape, ParsedApiPayload } from '@pastane/tr-api-errors';
import {
  DEFAULT_ERROR,
  mapApiErrorToTurkish,
  mapPayloadToTurkish,
  mapUnknownErrorToTurkish,
} from '@pastane/tr-api-errors';

export type { ApiErrorShape };

export const CUSTOMER_DEFAULT_ERROR = DEFAULT_ERROR.customer;

/**
 * Public helper: map API `error` object + HTTP status to a single Turkish string for shoppers.
 */
export function customerFacingMessageFromApi(
  status: number,
  error?: ApiErrorShape,
  contextualFallback?: string,
): string {
  return mapApiErrorToTurkish('customer', status, error, contextualFallback);
}

export function customerFacingMessageFromUnknownError(
  error: unknown,
  contextualFallback = CUSTOMER_DEFAULT_ERROR,
): string {
  return mapUnknownErrorToTurkish('customer', error, contextualFallback);
}

export type ParsedCustomerApiPayload = ParsedApiPayload;

/**
 * Derive user-facing text from a parsed JSON body and response status (BFF or Nest envelope).
 */
export function messageFromCustomerApiPayload(
  status: number,
  payload: ParsedCustomerApiPayload | null | undefined,
  contextualFallback: string,
): string {
  return mapPayloadToTurkish('customer', status, payload, contextualFallback);
}
