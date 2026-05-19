export function MetricCard({ label, value }: Readonly<{ label: string; value: string }>): React.JSX.Element {
  return (
    <article className="rounded-3xl border bg-white p-5 shadow-sm">
      <p className="text-sm text-stone-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
    </article>
  );
}
