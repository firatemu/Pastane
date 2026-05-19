'use client';
import { useEffect, useState } from 'react';
import { adminFetch } from '../../lib/api/catalog';
import { adminMessageFromUnknownError } from '../../lib/messages/admin-facing-errors';
import type { DashboardSummary } from '../../lib/operations/types';
import { MetricCard } from './metric-card';
import { PollingNote } from '../shared/polling-note';
import { ErrorState, LoadingState } from '../shared/async-state';

export function DashboardLiveMetrics(): React.JSX.Element {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load(): Promise<void> {
    try {
      setError(null);
      setData(await adminFetch<DashboardSummary>('/reports/dashboard-summary'));
    } catch (e) {
      setError(adminMessageFromUnknownError(e, 'Gösterge paneli yüklenemedi.'));
    }
  }

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 20000);
    return () => clearInterval(id);
  }, []);

  const cards = data
    ? [
        ['Bekleyen aksiyon', data.awaitingAction],
        ['Hazırlanan', data.inPreparation],
        ['Kurye atama bekleyen', data.readyForAssignment],
        ['Düşük stok', data.lowStock],
        ['Tükenen stok', data.outOfStock],
        ['Bekleyen yorum', data.pendingReviews],
      ]
    : [];

  return (
    <div className="space-y-3">
      <PollingNote seconds={20} />
      {error ? (
        <ErrorState message={error} />
      ) : !data ? (
        <LoadingState label="Gösterge paneli yükleniyor…" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map(([label, value]) => (
            <MetricCard key={String(label)} label={String(label)} value={String(value)} />
          ))}
        </div>
      )}
    </div>
  );
}

