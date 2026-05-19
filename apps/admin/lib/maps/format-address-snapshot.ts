/** Siparişteki teslimat adresi JSON özetini kısa metne çevirir. */

export function formatAddressSnapshot(summary: unknown): string {
  if (!summary || typeof summary !== 'object') {
    return 'Adres bilgisi yok';
  }
  const value = summary as Record<string, unknown>;
  const parts = [
    value.district,
    value.neighborhood,
    value.fullAddress,
    value.directions,
  ].filter((item): item is string => typeof item === 'string' && item.length > 0);
  return parts.length > 0 ? parts.join(' · ') : 'Adres bilgisi yok';
}
