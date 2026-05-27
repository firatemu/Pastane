export const ORDER_STATUS_LABELS: Record<string, string> = {
  NEW: 'Yeni',
  PAYMENT_PENDING: 'Ödeme bekleniyor',
  CONFIRMED: 'Sipariş alındı',
  PREPARING: 'Hazırlanıyor',
  READY: 'Hazırlık tamamlandı',
  ASSIGNED_TO_COURIER: 'Kuryeye atandı',
  OUT_FOR_DELIVERY: 'Yolda',
  DELIVERED: 'Teslim edildi',
  DELIVERY_FAILED: 'Teslim edilemedi',
  CANCELLED: 'İptal edildi',
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Ödeme bekleniyor',
  SUCCESS: 'Ödeme alındı',
  FAILED: 'Ödeme başarısız',
  REFUNDED: 'İade edildi',
  TIMEOUT: 'Ödeme süresi doldu',
};

export const CUSTOMER_TIMELINE = ['PAYMENT_PENDING', 'CONFIRMED', 'PREPARING', 'ASSIGNED_TO_COURIER', 'OUT_FOR_DELIVERY', 'DELIVERED'] as const;
export const ACTIVE_ORDER_STATUSES = new Set([
  'PAYMENT_PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'ASSIGNED_TO_COURIER',
  'OUT_FOR_DELIVERY',
]);
export const CANCELLABLE_STATUSES = new Set(['PAYMENT_PENDING', 'CONFIRMED']);

export function statusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status] ?? status;
}

export function paymentStatusLabel(status?: string): string {
  return status ? PAYMENT_STATUS_LABELS[status] ?? status : 'Ödeme bilgisi yok';
}

export function orderStatusTextClass(status: string): { color: string } {
  switch (status) {
    case 'DELIVERED':
      return { color: '#2e7d4f' };
    case 'CANCELLED':
      return { color: '#ba1a1a' };
    case 'DELIVERY_FAILED':
      return { color: '#c2410c' };
    case 'PAYMENT_PENDING':
      return { color: '#735c00' };
    case 'CONFIRMED':
      return { color: '#2563eb' };
    case 'PREPARING':
      return { color: '#1d4ed8' };
    case 'READY':
      return { color: '#0f766e' };
    case 'ASSIGNED_TO_COURIER':
    case 'OUT_FOR_DELIVERY':
      return { color: '#6d28d9' };
    default:
      return { color: '#434843' };
  }
}

export function loyaltyMovementLabel(type: string): string {
  if (type === 'EARN') return 'Kazanım';
  if (type === 'REDEEM') return 'Kullanım';
  if (type === 'ADJUSTMENT') return 'Düzenleme';
  return type;
}

export function deliveryStatusLabel(status?: string): string {
  if (!status) return '—';
  const map: Record<string, string> = {
    ASSIGNED: 'Kuryeye atandı',
    PICKED_UP: 'Kurye teslim aldı',
    OUT_FOR_DELIVERY: 'Yolda',
    DELIVERED: 'Teslim edildi',
    FAILED: 'Teslimat başarısız',
  };
  return map[status] ?? status;
}
