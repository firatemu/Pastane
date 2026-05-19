import { describe, expect, it } from 'vitest';

import { orderLineTotalTry } from './line-total';
import type { OrderItemRow } from './types';

describe('orderLineTotalTry', () => {
  it('multiplies (unit + option modifiers) by quantity', () => {
    const item: OrderItemRow = {
      id: 'i1',
      productNameSnapshot: 'Kuru pasta',
      quantity: 2,
      unitPriceSnapshot: '10.00',
      options: [{ orderItemId: 'i1', optionId: 'o1', optionNameSnapshot: 'Ekstra', priceModifierSnapshot: '5' }],
    };
    expect(orderLineTotalTry(item)).toBe(30);
  });

  it('handles missing snapshots as zero', () => {
    const item: OrderItemRow = {
      id: 'i2',
      productNameSnapshot: 'Simit',
      quantity: 3,
      options: [],
    };
    expect(orderLineTotalTry(item)).toBe(0);
  });
});
