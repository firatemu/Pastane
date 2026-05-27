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
    <section className="space-y-4">
      {/* ─── Unified Dashboard ─── */}
      <div className="rounded-xl border border-stone-200 bg-white shadow-sm">
        {/* Üst şerit: Başlık + polling */}
        <div className="flex flex-col gap-3 border-b border-stone-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100">
              <svg className="h-4.5 w-4.5 text-amber-700" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25m-3.75 0V5.625m0 12.75v-2.25m0-5.625v2.25m0-2.25H5.625c-.621 0-1.125.504-1.125 1.125v5.25c0 .621.504 1.125 1.125 1.125m5.625-7.5h3.75m-3.75 0V5.625m0 0A2.625 2.625 0 0 1 13.875 3h.375a2.625 2.625 0 0 1 2.625 2.625V5.625m0 0h1.5" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-stone-900">Teslimatlar</h1>
              <p className="text-xs text-stone-500">Atanan teslimat görevlerinizi yönetin</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Canlı durum indicator */}
            <div className="hidden items-center gap-1.5 sm:flex">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              <span className="text-xs text-stone-500">{todayIstanbulKey()}</span>
            </div>
            <PollingNote seconds={15} lastRefreshedAt={lastRefreshedAt} pollWarning={pollWarning} />
          </div>
        </div>

        {/* Dashboard grid */}
        <div className="p-4 sm:p-5">
          {/* Ana metrikler: 2 satır x 4 sütun */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
            {/* Satır 1: Operasyonel */}
            <MetricCell
              icon={<path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />}
              label="Aktif"
              value={report.active}
              color="amber"
            />
            <MetricCell
              icon={<path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />}
              label="Teslim"
              value={report.deliveredToday}
              color="emerald"
            />
            <MetricCell
              icon={<path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />}
              label="Başarı"
              value={`${report.successRate}%`}
              color="sky"
            />
            <MetricCell
              icon={<path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />}
              label="Sorunlu"
              value={report.failedToday}
              color="red"
            />
            {/* Satır 2: Durum dağılımı */}
            <MetricCell
              icon={<path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c.649 0 1.2.277 1.6.723" />}
              label="Atanmış"
              value={report.assigned}
              color="stone"
            />
            <MetricCell
              icon={<path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25m-3.75 0V5.625m0 12.75v-2.25m0-5.625v2.25m0-2.25H5.625c-.621 0-1.125.504-1.125 1.125v5.25c0 .621.504 1.125 1.125 1.125m5.625-7.5h3.75m-3.75 0V5.625m0 0A2.625 2.625 0 0 1 13.875 3h.375a2.625 2.625 0 0 1 2.625 2.625V5.625m0 0h1.5" />}
              label="Yolda"
              value={report.inTransit}
              color="stone"
            />
            <MetricCell
              icon={<path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />}
              label="Ürün"
              value={report.itemCount}
              color="stone"
            />
            <MetricCell
              icon={<path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />}
              label="Ciro"
              value={formatTryAmount(report.deliveredRevenue) ?? '₺0'}
              color="amber"
            />
          </div>

          {/* Alt bilgi şeridi */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-stone-100 pt-3 text-xs text-stone-500">
            <span className="flex items-center gap-1">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
              </svg>
              Ort. süre: <span className="font-medium text-stone-700">{report.averageDurationLabel}</span>
            </span>
            <span className="flex items-center gap-1">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              {report.staleActive > 0 ? (
                <><span className="font-medium text-amber-700">{report.staleActive}</span> görev 45+ dk güncellenmedi</>
              ) : (
                <span className="text-emerald-700">Tüm görevler güncel</span>
              )}
            </span>
            {meta ? (
              <span className="flex items-center gap-1">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
                </svg>
                Kapsam: <span className="font-medium text-stone-700">{rows.length}/{meta.total}</span>
              </span>
            ) : null}
            {report.withScheduledTime > 0 ? (
              <span className="flex items-center gap-1">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                </svg>
                <span className="font-medium text-stone-700">{report.withScheduledTime}</span> planlı teslimat
              </span>
            ) : null}
          </div>

          {/* Görev dağılımı progress bar'ları */}
          <div className="mt-3 grid grid-cols-5 gap-2 border-t border-stone-100 pt-3 sm:gap-3">
            <MiniBar label="Atandı" value={report.assigned} total={rows.length} color="bg-amber-500" />
            <MiniBar label="Alındı" value={report.pickedUp} total={rows.length} color="bg-sky-500" />
            <MiniBar label="Yolda" value={report.outForDelivery} total={rows.length} color="bg-blue-600" />
            <MiniBar label="Teslim" value={report.deliveredToday} total={rows.length} color="bg-emerald-500" />
            <MiniBar label="Sorun" value={report.failedToday} total={rows.length} color="bg-red-500" />
          </div>
        </div>
      </div>

      {/* ─── Loading / Error / Empty States ─── */}
      {loading ? <LoadingState label="Teslimatlar yükleniyor…" /> : null}
      {!loading && error && rows.length === 0 ? <ErrorState message={error} /> : null}
      {!loading && rows.length === 0 && !error ? <EmptyState /> : null}

      {rows.length > 0 ? (
        <div className="space-y-4">
          {error ? <ErrorState message={error} /> : null}

          {/* ─── Filtre Çubuğu ─── */}
          <div className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm sm:p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              {/* Arama */}
              <div className="flex-1">
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <svg className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                    </svg>
                  </div>
                  <input
                    className="h-10 w-full rounded-lg border border-stone-200 bg-stone-50 pl-9 pr-4 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20"
                    placeholder="Sipariş no, müşteri, telefon veya adres"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </div>
              </div>

              {/* Filtreler - mobilde 2x2 grid */}
              <div className="grid grid-cols-3 gap-2 sm:flex sm:items-end">
                <select
                  className="h-10 rounded-lg border border-stone-200 bg-stone-50 px-2.5 text-xs text-stone-900 outline-none transition focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20 sm:px-3 sm:text-sm"
                  value={queueFilter}
                  onChange={(event) => setQueueFilter(event.target.value as QueueFilter)}
                >
                  <option value="ALL">Tümü</option>
                  <option value="ACTIVE">Aktif</option>
                  <option value="DONE_TODAY">Teslim</option>
                  <option value="FAILED_TODAY">Sorunlu</option>
                </select>
                <select
                  className="h-10 rounded-lg border border-stone-200 bg-stone-50 px-2.5 text-xs text-stone-900 outline-none transition focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20 sm:px-3 sm:text-sm"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as DeliveryStatus | '')}
                >
                  <option value="">Durum</option>
                  {(Object.keys(statusLabels) as DeliveryStatus[]).map((status) => (
                    <option key={status} value={status}>
                      {statusLabels[status]}
                    </option>
                  ))}
                </select>
                <select
                  className="h-10 rounded-lg border border-stone-200 bg-stone-50 px-2.5 text-xs text-stone-900 outline-none transition focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20 sm:px-3 sm:text-sm"
                  value={sortMode}
                  onChange={(event) => setSortMode(event.target.value as SortMode)}
                >
                  <option value="PRIORITY">Öncelik</option>
                  <option value="NEWEST">En yeni</option>
                  <option value="OLDEST">En eski</option>
                  <option value="TOTAL_DESC">Tutar ↓</option>
                </select>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-xs text-stone-400">
                {filteredRows.length === rows.length
                  ? `${rows.length} teslimat`
                  : `${filteredRows.length} / ${rows.length} filtrelendi`}
              </p>
            </div>
          </div>

          {/* ─── Teslimat Kartları ─── */}
          <div className="space-y-3">
            {filteredRows.length > 0 ? (
              filteredRows.map((row) => <DeliveryCard key={row.id} delivery={row} />)
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center">
                <svg className="mb-3 h-10 w-10 text-stone-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
                <p className="text-sm font-medium text-stone-600">Bu filtrelerle teslimat bulunamadı</p>
                <p className="mt-1 text-xs text-stone-400">Filtreleri değiştirerek tekrar deneyin</p>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

/* ─────────────────────── Alt Bileşenler ─────────────────────── */

function MetricCell({
  icon,
  label,
  value,
  color = 'stone',
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color?: 'amber' | 'emerald' | 'sky' | 'red' | 'stone';
}) {
  const colorMap = {
    amber: { bg: 'bg-amber-50', icon: 'text-amber-600', border: 'border-amber-100' },
    emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', border: 'border-emerald-100' },
    sky: { bg: 'bg-sky-50', icon: 'text-sky-600', border: 'border-sky-100' },
    red: { bg: 'bg-red-50', icon: 'text-red-600', border: 'border-red-200' },
    stone: { bg: 'bg-stone-50', icon: 'text-stone-500', border: 'border-stone-200' },
  };
  const c = colorMap[color];

  return (
    <div className={`rounded-lg border ${c.border} ${c.bg} p-2.5 sm:p-3`}>
      <div className="flex items-center gap-1.5">
        <svg className={`h-3.5 w-3.5 ${c.icon}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          {icon}
        </svg>
        <span className="text-[10px] font-medium uppercase tracking-wider text-stone-500">{label}</span>
      </div>
      <p className={`mt-1 text-lg font-bold sm:text-xl ${color === 'red' ? 'text-red-700' : 'text-stone-900'}`}>
        {value}
      </p>
    </div>
  );
}

function MiniBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="text-center">
      <p className="text-xs font-bold text-stone-900">{value}</p>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-1 text-[10px] text-stone-500">{label}</p>
    </div>
  );
}

/* ─────────────────────── Yardımcı Fonksiyonlar ─────────────────────── */

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