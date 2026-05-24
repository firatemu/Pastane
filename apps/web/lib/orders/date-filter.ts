const TARIH_PARAM = 'tarih';
const TARIH_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function parseTarihQueryParam(raw: string | null): string | undefined {
  if (!raw || !TARIH_PATTERN.test(raw)) return undefined;
  return raw;
}

export function buildOrdersListSearch(tarih?: string): string {
  if (!tarih) return '';
  return `?${TARIH_PARAM}=${encodeURIComponent(tarih)}`;
}
