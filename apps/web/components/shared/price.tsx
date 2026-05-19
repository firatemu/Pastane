export function Price({ value, previous }: Readonly<{ value: string; previous?: string | null }>): React.JSX.Element {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-xl font-semibold text-stone-950">{formatTry(value)}</span>
      {previous ? <span className="text-sm text-stone-400 line-through">{formatTry(previous)}</span> : null}
    </div>
  );
}

export function formatTry(value: string): string {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Number(value));
}
