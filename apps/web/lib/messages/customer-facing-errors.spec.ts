import { describe, expect, it } from 'vitest';
import { customerFacingMessageFromApi, customerFacingMessageFromUnknownError } from './customer-facing-errors';

describe('customerFacingMessageFromApi', () => {
  it('maps known error codes', () => {
    expect(customerFacingMessageFromApi(401, { code: 'AUTH_INVALID_CREDENTIALS', message: 'Invalid credentials' })).toContain('Telefon');
  });

  it('maps English phrases when code is missing', () => {
    expect(customerFacingMessageFromApi(401, { message: 'Invalid credentials' })).toContain('Telefon');
  });

  it('uses status fallback for empty body', () => {
    expect(customerFacingMessageFromApi(404, undefined)).toContain('bulunamadı');
  });
});

describe('customerFacingMessageFromUnknownError', () => {
  it('maps fetch failures', () => {
    expect(customerFacingMessageFromUnknownError(new TypeError('Failed to fetch'))).toContain('Bağlantı');
  });
});
