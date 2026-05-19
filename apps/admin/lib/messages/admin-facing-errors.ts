/**
 * Maps Nest API envelopes and common English phrases to Turkish copy for the admin panel.
 * Shared logic lives in `@pastane/tr-api-errors`; this module keeps stable import paths for the admin app.
 */

import type { ApiErrorShape, ParsedApiPayload } from '@pastane/tr-api-errors';
import {
  DEFAULT_ERROR,
  mapApiErrorToTurkish,
  mapPayloadToTurkish,
  mapUnknownErrorToTurkish,
} from '@pastane/tr-api-errors';

export type { ApiErrorShape };

export const ADMIN_DEFAULT_ERROR = DEFAULT_ERROR.admin;

export function adminFacingMessageFromApi(
  status: number,
  error?: ApiErrorShape,
  contextualFallback?: string,
): string {
  return mapApiErrorToTurkish('admin', status, error, contextualFallback);
}

export type ParsedAdminApiPayload = ParsedApiPayload;

export function messageFromAdminApiPayload(
  status: number,
  payload: ParsedAdminApiPayload | null | undefined,
  contextualFallback: string,
): string {
  return mapPayloadToTurkish('admin', status, payload, contextualFallback);
}

export function adminMessageFromUnknownError(
  error: unknown,
  contextualFallback = ADMIN_DEFAULT_ERROR,
): string {
  return mapUnknownErrorToTurkish('admin', error, contextualFallback);
}
