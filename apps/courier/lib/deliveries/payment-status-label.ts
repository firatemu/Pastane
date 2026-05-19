/** Latest payment status from order — courier-safe summary (no card data). */
const LABELS: Record<string, string> = {
  PENDING: 'Ödeme bekleniyor',
  SUCCESS: 'Ödeme tamam',
  FAILED: 'Ödeme başarısız',
  REFUNDED: 'İade edildi',
  TIMEOUT: 'Ödeme zaman aşımı',
};

export function paymentStatusLabel(status: string | undefined | null): string {
  if (!status) return 'Ödeme bilgisi yok';
  return LABELS[status] ?? status;
}

export function paymentStatusBadgeClass(status: string | undefined | null): string {
  switch (status) {
    case 'SUCCESS':
      return 'bg-green-100 text-green-900';
    case 'PENDING':
      return 'bg-amber-100 text-amber-900';
    case 'FAILED':
    case 'TIMEOUT':
      return 'bg-red-100 text-red-900';
    case 'REFUNDED':
      return 'bg-stone-200 text-stone-800';
    default:
      return 'bg-stone-100 text-stone-800';
  }
}
