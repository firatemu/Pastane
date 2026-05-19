/** Formats `Order.addressSnapshot` JSON for courier display (district, neighborhood, fullAddress, directions). */
export function formatAddressSnapshot(snapshot: unknown): string {
  if (!snapshot || typeof snapshot !== 'object') return 'Adres bilgisi yok';
  const value = snapshot as Record<string, unknown>;
  const parts = [value.district, value.neighborhood, value.fullAddress, value.directions].filter(
    (item): item is string => typeof item === 'string' && item.length > 0,
  );
  return parts.length > 0 ? parts.join(' · ') : 'Adres bilgisi yok';
}
