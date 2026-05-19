/** Siparişteki `addressSnapshot` JSON için enlem/boylam (sipariş anında kopyalanmış adres). */

export interface SnapshotLngLat {
  lat: number
  lng: number
}

export function parseAddressSnapshotLngLat(snapshot: unknown): SnapshotLngLat | null {
  if (!snapshot || typeof snapshot !== 'object') {
    return null
  }
  const o = snapshot as Record<string, unknown>
  const lat = o.latitude
  const lng = o.longitude
  if (
    typeof lat !== 'number' ||
    typeof lng !== 'number' ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    return null
  }
  return { lat, lng }
}
