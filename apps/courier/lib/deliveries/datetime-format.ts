export function formatDateTimeTurkish(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
}

/** Human-readable duration between pickup and delivery (courier operations). */
export function formatDeliveryDuration(pickedUpAt: string | null | undefined, deliveredAt: string | null | undefined): string | null {
  if (!pickedUpAt || !deliveredAt) return null;
  const a = new Date(pickedUpAt).getTime();
  const b = new Date(deliveredAt).getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return null;
  const minutes = Math.round((b - a) / 60_000);
  if (minutes < 1) return '< 1 dk';
  if (minutes < 60) return `${minutes} dk`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} sa ${m} dk` : `${h} sa`;
}
