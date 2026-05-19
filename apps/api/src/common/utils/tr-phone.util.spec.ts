import { normalizeTrMobilePhoneDigits } from './tr-phone.util';

describe('normalizeTrMobilePhoneDigits', () => {
  it('keeps 90-prefixed numbers', () => {
    expect(normalizeTrMobilePhoneDigits('905550000010')).toBe('905550000010');
  });

  it('maps leading 0 national format to 90 prefix', () => {
    expect(normalizeTrMobilePhoneDigits('05550000010')).toBe('905550000010');
  });

  it('maps 10-digit 5… numbers to 90 prefix', () => {
    expect(normalizeTrMobilePhoneDigits('5550000010')).toBe('905550000010');
  });

  it('strips non-digits', () => {
    expect(normalizeTrMobilePhoneDigits('+90 555 000 00 10')).toBe('905550000010');
  });
});
