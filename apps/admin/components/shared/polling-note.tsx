export function PollingNote({ seconds }: { seconds: number }) {
  return (
    <p className="inline-flex items-center gap-2 self-start rounded-full border border-outline-variant/70 bg-surface-container-lowest px-2.5 py-1 text-[11px] font-medium text-on-surface-variant shadow-sm">
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-secondary" />
      Veriler {seconds} saniyede bir yenilenir.
    </p>
  );
}
