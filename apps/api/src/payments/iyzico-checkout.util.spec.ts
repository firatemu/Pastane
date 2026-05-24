import { Decimal } from '@prisma/client/runtime/library';
import { DeliveryType } from '@prisma/client';
import {
  buildIyzicoBasketItems,
  extractCheckoutFormContent,
  toIyzicoBasketItemId,
} from './iyzico-checkout.util';

describe('iyzico-checkout.util', () => {
  it('uses compact basket item ids', () => {
    expect(toIyzicoBasketItemId('726654b0-6ae9-4c2a-8c4b-9dd8d38af9c5', 0)).toMatch(/^bi1-/);
    expect(toIyzicoBasketItemId('726654b0-6ae9-4c2a-8c4b-9dd8d38af9c5', 0)).not.toContain('-6ae9');
  });

  it('falls back to single line when basket sum mismatches', () => {
    const items = buildIyzicoBasketItems({
      id: 'order-1',
      orderNumber: 'ORD-1',
      grandTotal: new Decimal('100.00'),
      deliveryType: DeliveryType.PICKUP,
      items: [
        {
          id: 'line-1',
          quantity: 1,
          unitPriceSnapshot: new Decimal('90.00'),
          productNameSnapshot: 'Test',
          product: { category: { name: 'Tatlılar' } },
        },
      ],
    } as never);
    expect(items).toHaveLength(1);
    expect(items[0]?.price).toBe('100.00');
  });

  it('extracts checkout form content from payload', () => {
    expect(extractCheckoutFormContent({ checkoutFormContent: '<div/>' })).toBe('<div/>');
    expect(extractCheckoutFormContent({})).toBeNull();
  });
});
