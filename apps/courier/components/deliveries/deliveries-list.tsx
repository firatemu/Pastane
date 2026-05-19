'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { courierFetchEnvelope } from '../../lib/api/deliveries';
import { courierMessageFromUnknownError } from '../../lib/deliveries/courier-api-error';
import { groupDeliveries, todayIstanbulKey } from '../../lib/deliveries/group-deliveries';
import type { DeliveryListItem } from '../../lib/deliveries/types';
import { DeliveryCard } from './delivery-card';
import { EmptyState, ErrorState, LoadingState } from '../shared/async-state';
import { PollingNote } from '../shared/polling-note';

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold text-stone-900">{title}</h2>
        {hint ? <p className="text-xs text-stone-500">{hint}</p> : null}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function DeliveriesList(): React.JSX.Element {
  const [rows, setRows] = useState<DeliveryListItem[]>([]);
  const rowsRef = useRef<DeliveryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [pollWarning, setPollWarning] = useState<string | null>(null);

  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  const groups = useMemo(() => groupDeliveries(rows), [rows]);
  const summary = useMemo(() => {
    const t = todayIstanbulKey();
    return {
      active: groups.active.length,
      doneToday: groups.completedToday.length,
      failedToday: groups.failedToday.length,
      other: groups.other.length,
      todayLabel: t,
    };
  }, [groups]);

  async function load(): Promise<void> {
    try {
      setPollWarning(null);
      setError(null);
      const envelope = await courierFetchEnvelope('/my?limit=50');
      setRows(envelope.data);
      setLastRefreshedAt(new Date());
    } catch (caught) {
      setError(courierMessageFromUnknownError(caught, 'Teslimatlar yüklenemedi.'));
      if (rowsRef.current.length > 0) {
        setPollWarning('Güncelleme başarısız. Liste son başarılı yüklemeye göre.');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 15_000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-amber-700">Görev kuyruğu</p>
          <h1 className="mt-1 text-2xl font-semibold">Teslimatlarım</h1>
          {!loading && rows.length > 0 ? (
            <p className="mt-2 text-sm text-stone-600">
              Aktif <span className="font-semibold text-stone-900">{summary.active}</span>
              {summary.doneToday > 0 ? (
                <>
                  {' '}
                  · Bugün teslim <span className="font-semibold text-stone-900">{summary.doneToday}</span>
                </>
              ) : null}
              {summary.failedToday > 0 ? (
                <>
                  {' '}
                  · Başarısız (bugün){' '}
                  <span className="font-semibold text-red-800">{summary.failedToday}</span>
                </>
              ) : null}
              <span className="block text-xs text-stone-500">İstanbul günü: {summary.todayLabel}</span>
            </p>
          ) : null}
        </div>
        <PollingNote seconds={15} lastRefreshedAt={lastRefreshedAt} pollWarning={pollWarning} />
      </div>

      {loading ? <LoadingState label="Teslimatlar yükleniyor…" /> : null}
      {!loading && error && rows.length === 0 ? <ErrorState message={error} /> : null}
      {!loading && rows.length === 0 && !error ? <EmptyState /> : null}
      {rows.length > 0 ? (
        <div className="space-y-8">
          {error ? <ErrorState message={error} /> : null}

          {groups.active.length > 0 ? (
            <Section title={`Aktif görevler (${groups.active.length})`} hint="Önce teslim alındı, sonra teslim edildi akışını izleyin.">
              {groups.active.map((row) => (
                <DeliveryCard key={row.id} delivery={row} />
              ))}
            </Section>
          ) : !loading ? (
            <p className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
              Şu an aktif atanmış teslimat yok. Liste her 15 sn yenilenir.
            </p>
          ) : null}

          {groups.completedToday.length > 0 ? (
            <Section title={`Bugün tamamlanan (${groups.completedToday.length})`}>
              {groups.completedToday.map((row) => (
                <DeliveryCard key={row.id} delivery={row} />
              ))}
            </Section>
          ) : null}

          {groups.failedToday.length > 0 ? (
            <Section title={`Bugün iptal / başarısız (${groups.failedToday.length})`}>
              {groups.failedToday.map((row) => (
                <DeliveryCard key={row.id} delivery={row} />
              ))}
            </Section>
          ) : null}

          {groups.other.length > 0 ? (
            <Section title={`Önceki kayıtlar (${groups.other.length})`} hint="Bugün dışında tamamlanan veya başarısız teslimatlar.">
              {groups.other.map((row) => (
                <DeliveryCard key={row.id} delivery={row} />
              ))}
            </Section>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
