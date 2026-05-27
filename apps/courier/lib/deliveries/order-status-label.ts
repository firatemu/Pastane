/** OrderStatus enum snapshot from API — labels for courier read-only display. */
const LABELS: Record<string, string> = {
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

export function orderStatusLabel(status: string): string {
  return LABELS[status] ?? status;
}
