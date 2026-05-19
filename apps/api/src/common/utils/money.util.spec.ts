import { Prisma } from '@prisma/client';
import { money } from './money.util';

describe('money', () => {
  it('keeps decimal arithmetic exact', () => {
    expect(money.add('0.10', '0.20').equals(new Prisma.Decimal('0.30'))).toBe(true);
    expect(money.multiply('12.50', 3).equals(new Prisma.Decimal('37.50'))).toBe(true);
    expect(money.round('10.005').equals(new Prisma.Decimal('10.01'))).toBe(true);
  });
});
