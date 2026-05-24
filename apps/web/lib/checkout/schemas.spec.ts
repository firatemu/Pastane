import { describe, expect, it } from 'vitest';
import { checkoutDeliveryOnlySchema } from './schemas';

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

  it('requires address for delivery', () => {
    expect(checkoutDeliveryOnlySchema.safeParse({ deliveryType: 'HOME_DELIVERY', note: '' }).success).toBe(false);
  });

  it('accepts valid pickup payload', () => {
    expect(
      checkoutDeliveryOnlySchema.safeParse({ deliveryType: 'PICKUP', pickupStoreId: 'store-1', note: '' }).success,
    ).toBe(true);
  });
});
