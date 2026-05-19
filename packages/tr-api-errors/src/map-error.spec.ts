import { describe, expect, it } from 'vitest';

import { mapApiErrorToTurkish, mapPayloadToTurkish, validationDetailsUserHint } from './map-error';

describe('@pastane/tr-api-errors', () => {
  it('maps known auth code for all audiences', () => {
    expect(mapApiErrorToTurkish('customer', 401, { code: 'AUTH_INVALID_CREDENTIALS' })).toContain('Telefon');
    expect(mapApiErrorToTurkish('admin', 401, { code: 'AUTH_INVALID_CREDENTIALS' })).toContain('Telefon');
    expect(mapApiErrorToTurkish('courier', 401, { code: 'AUTH_INVALID_CREDENTIALS' })).toContain('hatalı');
  });

  it('uses validation details when Turkish', () => {
    const hint = validationDetailsUserHint([{ constraints: { isEmail: 'E-posta geçersiz' } }]);
    expect(hint).toContain('E-posta');
    expect(
      mapApiErrorToTurkish('customer', 400, {
        code: 'VALIDATION_FAILED',
        details: [{ constraints: { x: 'Alan zorunlu' } }],
      }),
    ).toContain('Alan');
  });

  it('hints when forbidNonWhitelisted rejects unknown fields', () => {
    expect(validationDetailsUserHint(['property latitude should not exist'])).toContain('Sayfayı yenileyip');
    expect(
      mapApiErrorToTurkish('customer', 400, {
        code: 'VALIDATION_FAILED',
        details: [{ constraints: { whitelistValidation: 'property latitude should not exist' } }],
      }),
    ).toContain('Sayfayı yenileyip');
  });

  it('maps HTTP_429', () => {
    expect(mapApiErrorToTurkish('admin', 429, { code: 'HTTP_429' })).toContain('istek');
  });

  it('maps payload envelope', () => {
    expect(mapPayloadToTurkish('customer', 403, { error: { code: 'FORBIDDEN' } }, 'Yedek')).toContain('yetki');
  });
});
