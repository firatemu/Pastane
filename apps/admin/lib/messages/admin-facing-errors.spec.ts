import { describe, expect, it } from 'vitest';
import { adminFacingMessageFromApi, adminMessageFromUnknownError } from './admin-facing-errors';

describe('adminFacingMessageFromApi', () => {
  it('maps auth invalid credentials by code', () => {
    expect(adminFacingMessageFromApi(401, { code: 'AUTH_INVALID_CREDENTIALS', message: 'Invalid credentials' })).toContain('Telefon');
  });

  it('maps forbidden phrase', () => {
    expect(adminFacingMessageFromApi(403, { message: 'You do not have permission' })).toContain('yetkiniz');
  });

  it('uses status fallback when body empty', () => {
    expect(adminFacingMessageFromApi(404, undefined)).toContain('bulunamadı');
  });
});

describe('adminMessageFromUnknownError', () => {
  it('maps fetch failures', () => {
    expect(adminMessageFromUnknownError(new TypeError('Failed to fetch'))).toContain('Bağlantı');
  });
});
