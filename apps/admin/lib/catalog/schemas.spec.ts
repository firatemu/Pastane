import { describe, expect, it } from 'vitest';
import { productSchema } from './schemas';

describe('catalog schemas', () => {
  it('rejects discount above price', () => {
    expect(
      productSchema.safeParse({
        name: 'x',
        price: 10,
        discountedPrice: 11,
        categoryId: '00000000-0000-4000-8000-000000000000',
        status: 'ACTIVE',
        isPublished: true,
        allergenIds: [],
      }).success,
    ).toBe(false);
  });

  it('requires paired sale windows', () => {
    expect(
      productSchema.safeParse({
        name: 'x',
        price: 10,
        categoryId: '00000000-0000-4000-8000-000000000000',
        status: 'ACTIVE',
        isPublished: true,
        saleWindowStart: '08:00',
        allergenIds: [],
      }).success,
    ).toBe(false);
  });
});
