import { Prisma } from '@prisma/client';
export type Money = Prisma.Decimal;
export const money = {
  of: (value: Prisma.Decimal | string | number) => new Prisma.Decimal(value),
  add: (...values: Array<Prisma.Decimal | string | number>) => values.reduce<Prisma.Decimal>((a,b)=>a.add(b), new Prisma.Decimal(0)),
  subtract: (a:Prisma.Decimal|number|string,b:Prisma.Decimal|number|string)=>new Prisma.Decimal(a).sub(b),
  multiply: (a:Prisma.Decimal|number|string,b:Prisma.Decimal|number|string)=>new Prisma.Decimal(a).mul(b),
  compare: (a:Prisma.Decimal|number|string,b:Prisma.Decimal|number|string)=>new Prisma.Decimal(a).cmp(b),
  round: (a:Prisma.Decimal|number|string)=>new Prisma.Decimal(a).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP),
};
