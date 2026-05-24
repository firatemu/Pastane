'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAdaptivePolling } from '@pastane/ui';
import type { AdaptivePollOutcome } from '@pastane/ui';

import { courierFetchEnvelope } from '../../lib/api/deliveries';
import { formatAddressSnapshot } from '../../lib/deliveries/address-format';
import { courierMessageFromUnknownError } from '../../lib/deliveries/courier-api-error';
import { formatDeliveryDuration } from '../../lib/deliveries/datetime-format';
import { groupDeliveries, todayIstanbulKey } from '../../lib/deliveries/group-deliveries';
import { formatTryAmount } from '../../lib/deliveries/money-format';
import type {
  DeliveriesEnvelope,
  DeliveryListItem,
  DeliveryStatus,
} from '../../lib/deliveries/types';
import { DeliveryCard } from './delivery-card';
import { EmptyState, ErrorState, LoadingState } from '../shared/async-state';
import { PollingNote } from '../shared/polling-note';

type QueueFilter = 'ALL' | 'ACTIVE' | 'DONE_TODAY' | 'FAILED_TODAY';
type SortMode = 'PRIORITY' | 'NEWEST' | 'OLDEST' | 'TOTAL_DESC';

const statusLabels: Record<DeliveryStatus, string> = {
  ASSIGNED: 'Atandı',
  PICKED_UP: 'Teslim alındı',
  OUT_FOR_DELIVERY: 'Yolda',
  DELIVERED: 'Teslim edildi',
  FAILED: 'Başarısız',
};

const activeStatuses: DeliveryStatus[] = ['ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'];

export function DeliveriesList(): React.JSX.Element {
  const [rows, setRows] = useState<DeliveryListItem[]>([]);
  const rowsRef = useRef<DeliveryListItem[]>([]);
  const [meta, setMeta] = useState<DeliveriesEnvelope['meta'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [pollWarning, setPollWarning] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<DeliveryStatus | ''>('');
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('ALL');
  const [sortMode, setSortMode] = useState<SortMode>('PRIORITY');

  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  const pollTick = useCallback(async (): Promise<AdaptivePollOutcome> => {
    try {
      setPollWarning(null);
      setError(null);
      const envelope = await courierFetchEnvelope('/my?limit=100');
      setRows(envelope.data);
      setMeta(envelope.meta);
      setLastRefreshedAt(new Date());
      return 'ok';
    } catch (caught) {
      setError(courierMessageFromUnknownError(caught, 'Teslimatlar yüklenemedi.'));
      if (rowsRef.current.length > 0) {
        setPollWarning('Güncelleme başarısız. Liste son başarılı yüklemeye göre.');
      }
      return 'error';
    } finally {
      setLoading(false);
    }
  }, []);

  useAdaptivePolling({ poll: pollTick, immediate: true, baseIntervalMs: 15_000 });

  const groups = useMemo(() => groupDeliveries(rows), [rows]);
  const report = useMemo(() => buildReport(rows), [rows]);

  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('tr-TR');
    const scoped = rows.filter((row) => {
      if (statusFilter && row.status !== statusFilter) return false;
      if (queueFilter === 'ACTIVE' && !activeStatuses.includes(row.status)) return false;
      if (queueFilter === 'DONE_TODAY' && !groups.completedToday.some((item) => item.id === row.id))
        return false;
      if (queueFilter === 'FAILED_TODAY' && !groups.failedToday.some((item) => item.id === row.id))
        return false;
      if (!normalized) return true;
      const customer = `${row.order.user.firstName} ${row.order.user.lastName}`;
      const haystack = [
        row.order.orderNumber,
        customer,
        row.order.user.phone,
        row.order.status,
        row.status,
        row.failedReason ?? '',
        formatAddressSnapshot(row.order.addressSnapshot),
      ]
        .join(' ')
        .toLocaleLowerCase('tr-TR');
      return haystack.includes(normalized);
    });

    return [...scoped].sort((a, b) => compareDeliveries(a, b, sortMode));
  }, [groups.completedToday, groups.failedToday, query, queueFilter, rows, sortMode, statusFilter]);

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-sky-50 text-stone-950 shadow-xl">
        <div className="grid gap-5 p-5 lg:grid-cols-[1.35fr_0.65fr] lg:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">
              Kurye operasyon paneli
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Teslimat Kontrol Merkezi
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
              Atanan işleri önceliklendirin, riskli teslimatları görün, ödeme ve müşteri bilgilerine
              hızlı ulaşın.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <HeroMetric label="Aktif görev" value={report.active} tone="amber" />
              <HeroMetric label="Bugün teslim" value={report.deliveredToday} tone="green" />
              <HeroMetric label="Başarı oranı" value={`${report.successRate}%`} tone="blue" />
            </div>
          </div>
          <div className="rounded-3xl border border-white bg-white/80 p-4 shadow-sm ring-1 ring-amber-100">
            <p className="text-sm font-semibold text-stone-950">Canlı durum</p>
            <div className="mt-4 space-y-3 text-sm text-stone-600">
              <ReportLine
                label="Bugünkü ciro"
                value={formatTryAmount(report.deliveredRevenue) ?? '₺0,00'}
              />
              <ReportLine label="Ortalama teslim süresi" value={report.averageDurationLabel} />
              <ReportLine label="İstanbul günü" value={todayIstanbulKey()} />
              {meta ? (
                <ReportLine label="Kayıt kapsamı" value={`${rows.length}/${meta.total}`} />
              ) : null}
            </div>
            <div className="mt-4">
              <PollingNote
                seconds={15}
                lastRefreshedAt={lastRefreshedAt}
                pollWarning={pollWarning}
              />
            </div>
          </div>
        </div>
      </div>

      {loading ? <LoadingState label="Teslimatlar yükleniyor…" /> : null}
      {!loading && error && rows.length === 0 ? <ErrorState message={error} /> : null}
      {!loading && rows.length === 0 && !error ? <EmptyState /> : null}

      {rows.length > 0 ? (
        <div className="space-y-6">
          {error ? <ErrorState message={error} /> : null}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Atanmış" value={report.assigned} hint="Depodan teslim alınacak" />
            <MetricCard label="Yolda" value={report.inTransit} hint="Müşteriye giden işler" />
            <MetricCard
              label="Sorunlu"
              value={report.failedToday}
              hint="Bugün başarısız"
              tone="red"
            />
            <MetricCard
              label="Ürün adedi"
              value={report.itemCount}
              hint="Listelenen siparişlerde"
            />
          </div>

          <div className="rounded-[1.5rem] border border-stone-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px_180px]">
              <label className="block space-y-1.5 text-sm font-medium text-stone-800">
                <span className="text-stone-500">Ara</span>
                <input
                  className="h-11 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 text-sm outline-none transition focus:border-amber-500 focus:bg-white"
                  placeholder="Sipariş no, müşteri, telefon veya adres"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <label className="block space-y-1.5 text-sm font-medium text-stone-800">
                <span className="text-stone-500">Kuyruk</span>
                <select
                  className="h-11 w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 text-sm outline-none focus:border-amber-500 focus:bg-white"
                  value={queueFilter}
                  onChange={(event) => setQueueFilter(event.target.value as QueueFilter)}
                >
                  <option value="ALL">Tümü</option>
                  <option value="ACTIVE">Aktif işler</option>
                  <option value="DONE_TODAY">Bugün teslim</option>
                  <option value="FAILED_TODAY">Bugün sorunlu</option>
                </select>
              </label>
              <label className="block space-y-1.5 text-sm font-medium text-stone-800">
                <span className="text-stone-500">Durum</span>
                <select
                  className="h-11 w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 text-sm outline-none focus:border-amber-500 focus:bg-white"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as DeliveryStatus | '')}
                >
                  <option value="">Tümü</option>
                  {(Object.keys(statusLabels) as DeliveryStatus[]).map((status) => (
                    <option key={status} value={status}>
                      {statusLabels[status]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1.5 text-sm font-medium text-stone-800">
                <span className="text-stone-500">Sıralama</span>
                <select
                  className="h-11 w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 text-sm outline-none focus:border-amber-500 focus:bg-white"
                  value={sortMode}
                  onChange={(event) => setSortMode(event.target.value as SortMode)}
                >
                  <option value="PRIORITY">Operasyon önceliği</option>
                  <option value="NEWEST">En yeni sipariş</option>
                  <option value="OLDEST">En eski sipariş</option>
                  <option value="TOTAL_DESC">Tutar yüksek</option>
                </select>
              </label>
            </div>
            <p className="mt-3 text-xs text-stone-500">
              {filteredRows.length === rows.length
                ? `${rows.length} teslimat listeleniyor`
                : `${filteredRows.length} / ${rows.length} teslimat filtrelendi`}
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
            <div className="space-y-4">
              {filteredRows.length > 0 ? (
                filteredRows.map((row) => <DeliveryCard key={row.id} delivery={row} />)
              ) : (
                <div className="rounded-[1.5rem] border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-600">
                  Bu filtrelerle teslimat bulunamadı.
                </div>
              )}
            </div>

            <aside className="space-y-4">
              <ReportPanel title="Görev dağılımı">
                <StatusBar
                  label="Atandı"
                  value={report.assigned}
                  total={rows.length}
                  className="bg-amber-500"
                />
                <StatusBar
                  label="Teslim alındı"
                  value={report.pickedUp}
                  total={rows.length}
                  className="bg-sky-500"
                />
                <StatusBar
                  label="Yolda"
                  value={report.outForDelivery}
                  total={rows.length}
                  className="bg-blue-600"
                />
                <StatusBar
                  label="Teslim edildi"
                  value={report.deliveredToday}
                  total={rows.length}
                  className="bg-green-600"
                />
                <StatusBar
                  label="Başarısız"
                  value={report.failedToday}
                  total={rows.length}
                  className="bg-red-600"
                />
              </ReportPanel>
              <ReportPanel title="Operasyon notları">
                <ul className="space-y-3 text-sm text-stone-700">
                  <li className="rounded-2xl bg-amber-50 p-3">
                    <span className="font-semibold text-stone-900">{report.staleActive}</span> aktif
                    görev 45 dakikadan uzun süredir güncellenmedi.
                  </li>
                  <li className="rounded-2xl bg-stone-50 p-3">
                    <span className="font-semibold text-stone-900">{report.withScheduledTime}</span>{' '}
                    teslimatta planlanan zaman var.
                  </li>
                  <li className="rounded-2xl bg-green-50 p-3">
                    Bugün tamamlanan işlerde ortalama süre:{' '}
                    <span className="font-semibold text-stone-900">
                      {report.averageDurationLabel}
                    </span>
                  </li>
                </ul>
              </ReportPanel>
            </aside>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function buildReport(rows: DeliveryListItem[]) {
  const groups = groupDeliveries(rows);
  const assigned = rows.filter((row) => row.status === 'ASSIGNED').length;
  const pickedUp = rows.filter((row) => row.status === 'PICKED_UP').length;
  const outForDelivery = rows.filter((row) => row.status === 'OUT_FOR_DELIVERY').length;
  const deliveredTodayRows = groups.completedToday;
  const failedTodayRows = groups.failedToday;
  const completedToday = deliveredTodayRows.length + failedTodayRows.length;
  const deliveredRevenue = deliveredTodayRows.reduce(
    (sum, row) => sum + Number(row.order.grandTotal ?? 0),
    0,
  );
  const itemCount = rows.reduce((sum, row) => sum + (row.order._count?.items ?? 0), 0);
  const durations = deliveredTodayRows
    .map((row) => durationMinutes(row.pickedUpAt, row.deliveredAt))
    .filter((value): value is number => value !== null);
  const averageDuration = durations.length
    ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)
    : null;
  const successRate = completedToday
    ? Math.round((deliveredTodayRows.length / completedToday) * 100)
    : 100;
  const staleActive = rows.filter(
    (row) => activeStatuses.includes(row.status) && minutesSince(row.updatedAt) > 45,
  ).length;

  return {
    active: assigned + pickedUp + outForDelivery,
    assigned,
    pickedUp,
    inTransit: pickedUp + outForDelivery,
    outForDelivery,
    deliveredToday: deliveredTodayRows.length,
    failedToday: failedTodayRows.length,
    deliveredRevenue,
    itemCount,
    successRate,
    staleActive,
    withScheduledTime: rows.filter((row) => row.order.scheduledAt).length,
    averageDurationLabel:
      averageDuration === null ? 'Veri yok' : formatDurationMinutes(averageDuration),
  };
}

function compareDeliveries(a: DeliveryListItem, b: DeliveryListItem, sortMode: SortMode): number {
  if (sortMode === 'TOTAL_DESC')
    return Number(b.order.grandTotal ?? 0) - Number(a.order.grandTotal ?? 0);
  if (sortMode === 'NEWEST')
    return timeOf(b.order.createdAt ?? b.createdAt) - timeOf(a.order.createdAt ?? a.createdAt);
  if (sortMode === 'OLDEST')
    return timeOf(a.order.createdAt ?? a.createdAt) - timeOf(b.order.createdAt ?? b.createdAt);
  return (
    priorityScore(a) - priorityScore(b) ||
    timeOf(a.order.createdAt ?? a.createdAt) - timeOf(b.order.createdAt ?? b.createdAt)
  );
}

function priorityScore(row: DeliveryListItem): number {
  const statusScore: Record<DeliveryStatus, number> = {
    PICKED_UP: 0,
    OUT_FOR_DELIVERY: 1,
    ASSIGNED: 2,
    FAILED: 3,
    DELIVERED: 4,
  };
  return statusScore[row.status] * 10_000 - minutesSince(row.updatedAt);
}

function durationMinutes(
  start: string | null | undefined,
  end: string | null | undefined,
): number | null {
  if (!start || !end) return null;
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return null;
  return Math.round((b - a) / 60_000);
}

function minutesSince(iso: string | null | undefined): number {
  if (!iso) return 0;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 0;
  return Math.max(0, Math.round((Date.now() - then) / 60_000));
}

function timeOf(iso: string | null | undefined): number {
  if (!iso) return 0;
  const value = new Date(iso).getTime();
  return Number.isNaN(value) ? 0 : value;
}

function formatDurationMinutes(minutes: number): string {
  const now = new Date();
  const start = new Date(now.getTime() - minutes * 60_000);
  return formatDeliveryDuration(start.toISOString(), now.toISOString()) ?? `${minutes} dk`;
}

function HeroMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: 'amber' | 'green' | 'blue';
}) {
  const tones = {
    amber: 'bg-amber-100 text-amber-800 ring-amber-200',
    green: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
    blue: 'bg-sky-100 text-sky-800 ring-sky-200',
  };
  return (
    <div className={`rounded-3xl p-4 ring-1 ${tones[tone]}`}>
      <p className="text-xs font-medium uppercase tracking-[0.16em]">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-stone-950">{value}</p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  tone = 'stone',
}: {
  label: string;
  value: number;
  hint: string;
  tone?: 'stone' | 'red';
}) {
  return (
    <div
      className={`rounded-[1.5rem] border bg-white p-4 shadow-sm ${tone === 'red' ? 'border-red-100' : 'border-stone-200'}`}
    >
      <p className="text-sm font-medium text-stone-500">{label}</p>
      <p
        className={`mt-2 text-3xl font-semibold ${tone === 'red' ? 'text-red-700' : 'text-stone-950'}`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-stone-500">{hint}</p>
    </div>
  );
}

function ReportPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[1.5rem] border border-stone-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold text-stone-950">{title}</h2>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function ReportLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span>{label}</span>
      <span className="font-semibold text-stone-950">{value}</span>
    </div>
  );
}

function StatusBar({
  label,
  value,
  total,
  className,
}: {
  label: string;
  value: number;
  total: number;
  className: string;
}) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-stone-600">{label}</span>
        <span className="font-semibold text-stone-950">{value}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100">
        <div className={`h-full rounded-full ${className}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
