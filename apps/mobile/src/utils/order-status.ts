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

export const CUSTOMER_TIMELINE = ['PAYMENT_PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'ASSIGNED_TO_COURIER', 'OUT_FOR_DELIVERY', 'DELIVERED'] as const;
export const CANCELLABLE_STATUSES = new Set(['PAYMENT_PENDING', 'CONFIRMED']);

export function statusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status] ?? status;
}

export function loyaltyMovementLabel(type: string): string {
  if (type === 'EARN') return 'Kazanım';
  if (type === 'REDEEM') return 'Kullanım';
  if (type === 'ADJUSTMENT') return 'Düzenleme';
  return type;
}
