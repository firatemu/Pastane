/** Turkish locale currency (TRY → ₺) for consistent admin UI. */
export function formatTry(amount: number | string): string {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Number(amount));
}
