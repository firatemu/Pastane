import { createOrderNumber, orderNumberDatePrefix } from './order-number.util';

describe('order number utilities', () => {
  const date = new Date('2026-05-21T08:22:28.000Z');

  it('uses date plus a three digit daily sequence', () => {
    expect(createOrderNumber(1, date)).toBe('ORD-20260521001');
  });

  it('keeps the sequence constrained to three digits', () => {
    expect(() => createOrderNumber(1000, date)).toThrow('between 1 and 999');
  });

  it('exposes the date prefix for same-day sequence lookups', () => {
    expect(orderNumberDatePrefix(date)).toBe('ORD-20260521');
  });
});
