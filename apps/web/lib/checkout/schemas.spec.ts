import { describe, expect, it } from 'vitest';
import { checkoutDeliveryOnlySchema, checkoutSchema } from './schemas';
describe('checkoutDeliveryOnlySchema', () => {
  it('allows delivery selections without card fields', () => {
    const ok = checkoutDeliveryOnlySchema.safeParse({
      deliveryType: 'HOME_DELIVERY',
      addressId: 'a1',
      note: '',
    });
    expect(ok.success).toBe(true);
  });
  it('rejects pickup without store', () => {
    expect(checkoutDeliveryOnlySchema.safeParse({ deliveryType: 'PICKUP', note: '' }).success).toBe(false);
  });
});

describe('checkoutSchema', () => {
  const base = { deliveryType: 'HOME_DELIVERY' as const, cardHolderName: 'Demo Müşteri', cardNumber: '5528790000000008', expireMonth: '12', expireYear: '30', cvc: '123' };
  it('requires address for delivery', () => { expect(checkoutSchema.safeParse(base).success).toBe(false); });
  it('requires store for pickup', () => { expect(checkoutSchema.safeParse({ ...base, deliveryType: 'PICKUP' }).success).toBe(false); });
  it('accepts valid delivery payload', () => { expect(checkoutSchema.safeParse({ ...base, addressId: 'address-1' }).success).toBe(true); });
  it('normalizes spaces in card number and requires 16 digits', () => {
    const ok = checkoutSchema.safeParse({ ...base, cardNumber: '5528 7900 0000 0008', addressId: 'address-1' });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.cardNumber).toBe('5528790000000008');
    expect(checkoutSchema.safeParse({ ...base, cardNumber: '552879000000000', addressId: 'address-1' }).success).toBe(false);
  });
  it('rejects 4-digit expire year', () => {
    expect(checkoutSchema.safeParse({ ...base, expireYear: '2030', addressId: 'address-1' }).success).toBe(false);
  });
  it('rejects 4-digit cvc', () => {
    expect(checkoutSchema.safeParse({ ...base, cvc: '1234', addressId: 'address-1' }).success).toBe(false);
  });
});