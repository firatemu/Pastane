export const ORDER_STATUS_LABELS: Record<string, string> = {
  NEW: 'Yeni',
  PAYMENT_PENDING: 'Ödeme bekleniyor',
  CONFIRMED: 'Sipariş alındı',
  PREPARING: 'Hazırlanıyor',
  READY: 'Teslime hazır',
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

export const CUSTOMER_TIMELINE = ['PAYMENT_PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'ASSIGNED_TO_COURIER', 'OUT_FOR_DELIVERY', 'DELIVERED'] as const;
export const ACTIVE_ORDER_STATUSES = new Set(['PAYMENT_PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'ASSIGNED_TO_COURIER', 'OUT_FOR_DELIVERY']);
export const CANCELLABLE_STATUSES = new Set(['PAYMENT_PENDING', 'CONFIRMED']);

export function statusLabel(status: string): string { return ORDER_STATUS_LABELS[status] ?? status; }
export function paymentStatusLabel(status?: string): string { return status ? PAYMENT_STATUS_LABELS[status] ?? status : 'Ödeme bilgisi yok'; }
export function deliveryStatusLabel(status?: string): string { return status ? DELIVERY_STATUS_LABELS[status] ?? status : '—'; }
