import { ProductUnitKind } from '@prisma/client';
import { formatProductDisplayName } from './product-display.util';

describe('formatProductDisplayName', () => {
  it('formats weight products with quantity and symbol', () => {
    expect(
      formatProductDisplayName({
        name: 'Sütlaç',
        unitQuantity: 500,
        unit: { symbol: 'gr', kind: ProductUnitKind.WEIGHT },
      }),
    ).toBe('500 gr Sütlaç');
  });

  it('formats kg products', () => {
    expect(
      formatProductDisplayName({
        name: 'Yaş Pasta',
        unitQuantity: 1,
        unit: { symbol: 'kg', kind: ProductUnitKind.WEIGHT },
      }),
    ).toBe('1 kg Yaş Pasta');
  });

  it('returns plain name for count products without quantity', () => {
    expect(
      formatProductDisplayName({
        name: 'Simit',
        unitQuantity: null,
        unit: { symbol: 'adet', kind: ProductUnitKind.COUNT },
      }),
    ).toBe('Simit');
  });
});
