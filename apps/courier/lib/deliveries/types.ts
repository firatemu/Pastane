export type DeliveryStatus = 'ASSIGNED' | 'PICKED_UP' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'FAILED';

/** Prisma composite row: no single `id` on OrderItemOption. */
export interface OrderItemOptionRow {
  orderItemId: string;
  optionId: string;
  optionNameSnapshot: string;
  priceModifierSnapshot?: string;
}

export interface OrderItemRow {
  id: string;
  productNameSnapshot: string;
  quantity: number;
  customNote?: string | null;
  unitPriceSnapshot?: string;
  skuSnapshot?: string | null;
  taxRateSnapshot?: string | null;
  options: OrderItemOptionRow[];
}

export interface OrderPaymentRow {
  status: string;
}

/** Nested order summary on list responses (API-enriched). */
export interface DeliveryOrderList {
  id: string;
  orderNumber: string;
  status: string;
  scheduledAt: string | null;
  createdAt?: string;
  deliveryType?: string;
  grandTotal?: string;
  addressSnapshot: unknown;
  user: { id: string; firstName: string; lastName: string; phone: string };
  _count?: { items: number };
  payments?: OrderPaymentRow[];
}

export interface DeliveryListItem {
  id: string;
  status: DeliveryStatus;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  failedReason: string | null;
  createdAt: string;
  updatedAt: string;
  order: DeliveryOrderList;
}

export interface DeliveriesEnvelope {
  data: DeliveryListItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

/** Detail order: full scalars from Prisma `include` + relations. */
export interface DeliveryOrderDetail extends DeliveryOrderList {
  note?: string | null;
  updatedAt?: string;
  subtotal?: string;
  deliveryFee?: string;
  serviceFee?: string;
  loyaltyDiscount?: string;
  loyaltyPointsUsed?: number;
  items: OrderItemRow[];
  statusHistory: Array<{ id: string; status: string; note: string | null; createdAt: string }>;
}

export interface DeliveryDetail extends Omit<DeliveryListItem, 'order'> {
  order: DeliveryOrderDetail;
}

/** Stable React key for an option row from API JSON. */
export function orderItemOptionKey(option: OrderItemOptionRow): string {
  return `${option.orderItemId}:${option.optionId}`;
}
