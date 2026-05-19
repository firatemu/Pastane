export function PollingNote({
  seconds,
  lastRefreshedAt,
  pollWarning,
}: {
  seconds: number;
  lastRefreshedAt: Date | null;
  pollWarning?: string | null;
}): React.JSX.Element {
  const refreshed =
    lastRefreshedAt != null
      ? ` Son yenileme: ${lastRefreshedAt.toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'medium' })}.`
      : '';
  return (
    <div className="space-y-1 text-xs text-stone-500">
      <p>
        Her {seconds} saniyede güncellenir.{refreshed}
      </p>
      {pollWarning ? <p className="text-amber-800">{pollWarning}</p> : null}
    </div>
  );
}
