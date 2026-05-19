import type { OrderItemRow } from './types';

/** Approximate line total from order-time snapshots (unit + option modifiers × quantity). */
export function orderLineTotalTry(item: OrderItemRow): number {
  const unit = Number(item.unitPriceSnapshot ?? 0);
  const optionSum = item.options.reduce((s, o) => s + Number(o.priceModifierSnapshot ?? 0), 0);
  return (unit + optionSum) * item.quantity;
}
