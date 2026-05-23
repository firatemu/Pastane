import { ProductUnitKind } from '@prisma/client';

export type ProductDisplayInput = {
  name: string;
  unitQuantity?: { toString(): string } | string | number | null;
  unit?: { symbol: string; kind: ProductUnitKind } | null;
};

export function formatProductDisplayName(product: ProductDisplayInput): string {
  const unit = product.unit;
  if (!unit) return product.name;

  const rawQty = product.unitQuantity;
  const qty =
    rawQty == null || rawQty === ''
      ? null
      : typeof rawQty === 'object' && rawQty !== null && 'toString' in rawQty
        ? Number(rawQty.toString())
        : Number(rawQty);

  if (unit.kind === ProductUnitKind.COUNT) {
    if (qty != null && !Number.isNaN(qty) && qty > 1) {
      return `${formatQuantity(qty)} ${unit.symbol} ${product.name}`;
    }
    return product.name;
  }

  if (qty == null || Number.isNaN(qty) || qty <= 0) return product.name;
  return `${formatQuantity(qty)} ${unit.symbol} ${product.name}`;
}

function formatQuantity(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(3).replace(/\.?0+$/, '');
}
