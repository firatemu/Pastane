/** Format backend Decimal-as-string amounts for TRY display (no FX conversion). */
export function formatTryAmount(value: string | number | undefined | null): string | null {
  if (value === undefined || value === null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(n)) return null;
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n);
}
