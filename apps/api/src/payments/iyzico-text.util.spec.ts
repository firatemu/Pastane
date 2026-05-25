import { Decimal } from '@prisma/client/runtime/library';
import { friendlyIyzicoInitError, formatIyzicoMoney, sanitizeIyzicoText } from './iyzico-text.util';

describe('iyzico-text.util', () => {
  it('strips control characters from product names', () => {
    expect(sanitizeIyzicoText('K\u0000Börek')).toBe('K Börek');
  });

  it('normalizes em dash in addresses', () => {
    expect(sanitizeIyzicoText('Mağaza — Adres')).toBe('Mağaza - Adres');
  });

  it('strips emoji and normalizes smart punctuation', () => {
    expect(sanitizeIyzicoText('Yenişehir 📍 “Ev” …')).toBe('Yenişehir "Ev" ...');
  });

  it('formats money with two decimals', () => {
    expect(formatIyzicoMoney(new Decimal('395'))).toBe('395.00');
  });

  it('maps SDK JSON parse errors to Turkish', () => {
    expect(friendlyIyzicoInitError('Unexpected token "," is not valid JSON')).toMatch(/tekrar deneyin/i);
  });
});
