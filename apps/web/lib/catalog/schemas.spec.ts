import { describe, expect, it } from 'vitest';
import { buildCustomizationSchema } from './schemas';

const groups = [{ id: 'size', name: 'Kişi Sayısı', isRequired: true, isMultiple: false, sortOrder: 0, options: [{ id: 'small', name: '4-6 kişilik', priceModifier: '0', isActive: true, sortOrder: 0 }] }];

describe('customization schema', () => {
  it('requires required option groups', () => {
    const result = buildCustomizationSchema(groups).safeParse({ quantity: 1, selections: {} });
    expect(result.success).toBe(false);
  });
  it('accepts a valid required option', () => {
    const result = buildCustomizationSchema(groups).safeParse({ quantity: 2, selections: { size: ['small'] } });
    expect(result.success).toBe(true);
  });
});
