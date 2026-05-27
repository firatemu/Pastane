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

export const DELIVERY_STATUS_LABELS: Record<string, string> = {
  ASSIGNED: 'Kuryeye atandı',
  PICKED_UP: 'Kurye teslim aldı',
  OUT_FOR_DELIVERY: 'Yolda',
  DELIVERED: 'Teslim edildi',
  FAILED: 'Teslimat başarısız',
};

export const CUSTOMER_TIMELINE = ['PAYMENT_PENDING', 'CONFIRMED', 'PREPARING', 'ASSIGNED_TO_COURIER', 'OUT_FOR_DELIVERY', 'DELIVERED'] as const;
export const ACTIVE_ORDER_STATUSES = new Set(['PAYMENT_PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'ASSIGNED_TO_COURIER', 'OUT_FOR_DELIVERY']);
export const CANCELLABLE_STATUSES = new Set(['PAYMENT_PENDING', 'CONFIRMED']);

export function timelineStatus(status: string): string {
  return status === 'READY' ? 'PREPARING' : status;
}

export function statusLabel(status: string): string { return ORDER_STATUS_LABELS[status] ?? status; }
export function paymentStatusLabel(status?: string): string { return status ? PAYMENT_STATUS_LABELS[status] ?? status : 'Ödeme bilgisi yok'; }
export function deliveryStatusLabel(status?: string): string { return status ? DELIVERY_STATUS_LABELS[status] ?? status : '—'; }

/** Metin rengi — sipariş listesi ve detay satırları. */
export function orderStatusTextClass(status: string): string {
  switch (status) {
    case 'DELIVERED':
      return 'text-emerald-700';
    case 'CANCELLED':
      return 'text-red-700';
    case 'DELIVERY_FAILED':
      return 'text-orange-700';
    case 'PAYMENT_PENDING':
      return 'text-amber-700';
    case 'CONFIRMED':
      return 'text-sky-700';
    case 'PREPARING':
      return 'text-blue-700';
    case 'READY':
      return 'text-teal-700';
    case 'ASSIGNED_TO_COURIER':
    case 'OUT_FOR_DELIVERY':
      return 'text-violet-700';
    case 'NEW':
      return 'text-stone-600';
    default:
      return 'text-muted';
  }
}

export function orderStatusBadgeClass(status: string): string {
  const base = 'rounded-full px-3 py-1 text-xs font-semibold';
  switch (status) {
    case 'DELIVERED':
      return `${base} bg-emerald-50 text-emerald-800`;
    case 'CANCELLED':
    case 'DELIVERY_FAILED':
      return `${base} bg-red-50 text-red-800`;
    case 'PAYMENT_PENDING':
      return `${base} bg-amber-50 text-amber-900`;
    case 'CONFIRMED':
      return `${base} bg-sky-50 text-sky-800`;
    case 'PREPARING':
      return `${base} bg-blue-50 text-blue-800`;
    case 'READY':
      return `${base} bg-teal-50 text-teal-800`;
    case 'ASSIGNED_TO_COURIER':
    case 'OUT_FOR_DELIVERY':
      return `${base} bg-violet-50 text-violet-800`;
    default:
      return `${base} bg-amber-50 text-amber-900`;
  }
}

export function paymentStatusTextClass(status?: string): string {
  switch (status) {
    case 'SUCCESS':
      return 'text-emerald-600';
    case 'FAILED':
    case 'TIMEOUT':
      return 'text-red-600';
    case 'PENDING':
      return 'text-amber-600';
    case 'REFUNDED':
      return 'text-violet-600';
    default:
      return 'text-muted';
  }
}
