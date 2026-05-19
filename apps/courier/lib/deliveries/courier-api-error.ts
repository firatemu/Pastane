/**
 * Kurye paneli: Nest `error.code`, HTTP durumu ve sık İngilizce ifadeleri
 * sahada kısa Türkçe metinlere çevirir. Ortak eşleme: `@pastane/tr-api-errors`.
 */

import type { ApiErrorShape } from '@pastane/tr-api-errors';
import {
  DEFAULT_ERROR,
  mapApiErrorToTurkish,
  mapPayloadToTurkish,
  mapUnknownErrorToTurkish,
} from '@pastane/tr-api-errors';

export type { ApiErrorShape };

export const COURIER_DEFAULT_ERROR = DEFAULT_ERROR.courier;

export function courierFacingMessageFromApi(
  status: number,
  error?: ApiErrorShape,
  contextualFallback: string = COURIER_DEFAULT_ERROR,
): string {
  return mapApiErrorToTurkish('courier', status, error, contextualFallback);
}

export type ParsedCourierApiPayload = {
  success?: boolean;
  message?: string;
  error?: ApiErrorShape;
};

export function courierMessageFromPayload(
  status: number,
  payload: ParsedCourierApiPayload | null | undefined,
  contextualFallback: string,
): string {
  return mapPayloadToTurkish('courier', status, payload, contextualFallback);
}

/** @internal Eski çağrılar için — yeni kod `courierFacingMessageFromApi` kullanmalı. */
export function courierApiUserMessage(
  status: number,
  code: string | undefined,
  apiMessage: string | undefined,
): string {
  const error: ApiErrorShape | undefined =
    code !== undefined || apiMessage !== undefined
      ? {
          ...(code !== undefined ? { code } : {}),
          ...(apiMessage !== undefined ? { message: apiMessage } : {}),
        }
      : undefined;
  return courierFacingMessageFromApi(status, error);
}

export function courierMessageFromUnknownError(
  error: unknown,
  contextualFallback = COURIER_DEFAULT_ERROR,
): string {
  return mapUnknownErrorToTurkish('courier', error, contextualFallback);
}

export function redirectToCourierLogin(): void {
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}
