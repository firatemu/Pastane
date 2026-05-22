export function Price({ value, previous, size = 'default' }: Readonly<{ value: string; previous?: string | null; size?: 'default' | 'compact' }>): React.JSX.Element {
  const valueClass = size === 'compact' ? 'font-display text-lg font-semibold text-primary' : 'font-display text-2xl font-semibold text-primary';
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
