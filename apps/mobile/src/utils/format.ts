const money = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' });

export function formatTry(value: string | number | null | undefined): string {
  return money.format(Number(value ?? 0));
}

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}
