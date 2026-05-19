export function deliveryTypeLabel(deliveryType: string | undefined | null): string {
  if (deliveryType === 'PICKUP') return 'Mağazadan teslim';
  return 'Adrese teslim';
}
