/** Web `address-manager` ile aynı kural: haritadan geçerli pin zorunlu. */
export const MAP_PIN_REQUIRED_TR = 'Lütfen haritadan teslimat konumunu seçin.';

export function hasValidMapPin(latitude: number | null | undefined, longitude: number | null | undefined): boolean {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude)
  );
}
