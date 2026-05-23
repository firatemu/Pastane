export function Price({
  value,
  previous,
  size = 'default',
  tone = 'default',
}: Readonly<{
  value: string;
  previous?: string | null;
  size?: 'default' | 'compact';
  tone?: 'default' | 'danger';
}>): React.JSX.Element {
  const colorClass = tone === 'danger' ? 'text-error' : 'text-primary';
  const valueClass = size === 'compact' ? `font-body text-lg font-extrabold ${colorClass}` : `font-body text-2xl font-extrabold ${colorClass}`;
  return (
    <div className="flex items-baseline gap-2">
      <span className={valueClass}>{formatTry(value)}</span>
      {previous ? <span className={size === 'compact' ? 'text-xs text-muted/60 line-through' : 'text-sm text-muted/60 line-through'}>{formatTry(previous)}</span> : null}
    </div>
  );
}

export function formatTry(value: string): string {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Number(value));
}
