import { describe, expect, it } from 'vitest';

import {
  courierApiUserMessage,
  courierFacingMessageFromApi,
  courierMessageFromPayload,
  courierMessageFromUnknownError,
} from './courier-api-error';

describe('courier-api-error', () => {
  it('maps auth invalid credentials phrase', () => {
    expect(courierFacingMessageFromApi(401, { message: 'Invalid credentials' })).toContain('Telefon');
  });

  it('maps delivery transition code', () => {
    expect(courierApiUserMessage(409, 'DELIVERY_STATUS_TRANSITION_INVALID', undefined)).toContain('işlem');
  });

  it('maps login payload without data', () => {
    const msg = courierMessageFromPayload(401, { error: { code: 'AUTH_INVALID_CREDENTIALS' } }, 'Giriş başarısız.');
    expect(msg).toContain('şifre');
  });

  it('maps unknown fetch-style error to Turkish', () => {
    expect(courierMessageFromUnknownError(new Error('Failed to fetch'), 'Yedek')).toContain('Bağlantı');
  });
});
