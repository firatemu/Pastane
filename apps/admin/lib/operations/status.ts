import type { OrderStatus } from './types';

type DeliveryType = 'HOME_DELIVERY' | 'PICKUP';

export const ORDER_STATUSES: OrderStatus[] = [
  'NEW',
  'PAYMENT_PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'ASSIGNED_TO_COURIER',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'DELIVERY_FAILED',
  'CANCELLED',
];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  NEW: 'Yeni',
  PAYMENT_PENDING: 'Ödeme bekliyor',
  CONFIRMED: 'Onaylandı',
  PREPARING: 'Hazırlanıyor',
  READY: 'Hazırlık tamamlandı',
  ASSIGNED_TO_COURIER: 'Kuryeye atandı',
  OUT_FOR_DELIVERY: 'Yolda',
  DELIVERED: 'Teslim edildi',
  DELIVERY_FAILED: 'Teslim edilemedi',
  CANCELLED: 'İptal',
};

export const DELIVERY_TYPE_LABELS: Record<string, string> = {
  HOME_DELIVERY: 'Adrese teslim',
  PICKUP: 'Mağazadan teslim',
};

export const STATUS_TONES: Record<OrderStatus, string> = {
  NEW: 'bg-stone-100 text-stone-700',
  PAYMENT_PENDING: 'bg-amber-100 text-amber-900',
  CONFIRMED: 'bg-sky-100 text-sky-900',
  PREPARING: 'bg-violet-100 text-violet-900',
  READY: 'bg-emerald-100 text-emerald-900',
  ASSIGNED_TO_COURIER: 'bg-indigo-100 text-indigo-900',
  OUT_FOR_DELIVERY: 'bg-blue-100 text-blue-900',
  DELIVERED: 'bg-green-100 text-green-900',
  DELIVERY_FAILED: 'bg-orange-100 text-orange-900',
  CANCELLED: 'bg-red-100 text-red-900',
};

export const NEXT_STATUS: Record<OrderStatus, OrderStatus[]> = {
  NEW: ['PAYMENT_PENDING'],
  PAYMENT_PENDING: ['CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['ASSIGNED_TO_COURIER', 'DELIVERED'],
  READY: ['ASSIGNED_TO_COURIER', 'DELIVERED'],
  ASSIGNED_TO_COURIER: ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED', 'DELIVERY_FAILED'],
  DELIVERY_FAILED: ['CANCELLED', 'ASSIGNED_TO_COURIER'],
  DELIVERED: ['CANCELLED'],
  CANCELLED: [],
};

const HOME_DELIVERY_ADMIN_BLOCKED_TARGETS = new Set<OrderStatus>([
  'ASSIGNED_TO_COURIER',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'DELIVERY_FAILED',
]);

export function getAdminWorkflowTargets({
  status,
  deliveryType,
}: {
  status: OrderStatus;
  deliveryType: DeliveryType;
}): OrderStatus[] {
  const nextStatuses = NEXT_STATUS[status];

  if (deliveryType === 'PICKUP') {
    return nextStatuses.filter(
      (nextStatus) =>
        nextStatus !== 'ASSIGNED_TO_COURIER' &&
        nextStatus !== 'OUT_FOR_DELIVERY' &&
        nextStatus !== 'DELIVERY_FAILED',
    );
  }

  if (status === 'PREPARING' || status === 'READY') {
    return [];
  }

  if (status === 'ASSIGNED_TO_COURIER' || status === 'OUT_FOR_DELIVERY' || status === 'DELIVERY_FAILED') {
    return nextStatuses.filter((nextStatus) => nextStatus === 'CANCELLED');
  }

  return nextStatuses.filter(
    (nextStatus) => !HOME_DELIVERY_ADMIN_BLOCKED_TARGETS.has(nextStatus),
  );
}
