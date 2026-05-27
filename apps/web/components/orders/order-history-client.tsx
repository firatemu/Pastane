'use client';
import { useAdaptivePolling } from '@pastane/ui';
import type { AdaptivePollOutcome } from '@pastane/ui';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { buildOrdersListSearch, parseTarihQueryParam } from '../../lib/orders/date-filter';
import { fetchOrders } from '../../lib/orders/queries';
import {
  ACTIVE_ORDER_STATUSES,
  orderStatusBadgeClass,
  paymentStatusLabel,
  paymentStatusTextClass,
  statusLabel,
} from '../../lib/orders/status';
import type { Order } from '../../lib/orders/types';
import { customerFacingMessageFromUnknownError } from '../../lib/messages/customer-facing-errors';
import { formatTry } from '../shared/price';

function formatOrderDate(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function orderAccentClass(status: string): string {
  switch (status) {
    case 'DELIVERED':
      return 'border-l-emerald-400 bg-gradient-to-r from-emerald-50/80 to-white';
    case 'CANCELLED':
    case 'DELIVERY_FAILED':
      return 'border-l-red-400 bg-gradient-to-r from-red-50/80 to-white';
    case 'PAYMENT_PENDING':
      return 'border-l-amber-400 bg-gradient-to-r from-amber-50/90 to-white';
    case 'CONFIRMED':
      return 'border-l-sky-400 bg-gradient-to-r from-sky-50/80 to-white';
    case 'PREPARING':
      return 'border-l-blue-400 bg-gradient-to-r from-blue-50/80 to-white';
    case 'READY':
      return 'border-l-teal-400 bg-gradient-to-r from-teal-50/80 to-white';
    case 'ASSIGNED_TO_COURIER':
    case 'OUT_FOR_DELIVERY':
      return 'border-l-violet-400 bg-gradient-to-r from-violet-50/80 to-white';
    default:
      return 'border-l-honey bg-gradient-to-r from-amber-50/70 to-white';
  }
}

export function OrderHistoryClient(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tarih = parseTarihQueryParam(searchParams.get('tarih'));
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const ordersRef = useRef<Order[]>([]);

  const load = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      setOrders(await fetchOrders(tarih ? { tarih } : undefined));
    } catch (e) {
      setError(customerFacingMessageFromUnknownError(e, 'Siparişler alınamadı.'));
    } finally {
      setLoading(false);
    }
  }, [tarih]);

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const pollActiveOrders = useCallback(async (): Promise<AdaptivePollOutcome> => {
    if (!ordersRef.current.some((o) => ACTIVE_ORDER_STATUSES.has(o.status))) {
      return 'ok';
    }
    try {
      setError(null);
      setOrders(await fetchOrders(tarih ? { tarih } : undefined));
      return 'ok';
    } catch (e) {
      setError(customerFacingMessageFromUnknownError(e, 'Siparişler alınamadı.'));
      return 'error';
    }
  }, [tarih]);

  useAdaptivePolling({ poll: pollActiveOrders, immediate: false, baseIntervalMs: 25_000 });

  function setTarihParam(next: string | undefined): void {
    router.replace(`/siparisler${buildOrdersListSearch(next)}`);
  }

  const sortedOrders = [...orders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const activeCount = sortedOrders.filter((order) => ACTIVE_ORDER_STATUSES.has(order.status)).length;
  const deliveredCount = sortedOrders.filter((order) => order.status === 'DELIVERED').length;
  const paidCount = sortedOrders.filter((order) => order.payments?.[0]?.status === 'SUCCESS').length;

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-3xl border border-amber-100 bg-amber-50 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-secondary">Aktif</p>
          <p className="mt-2 text-3xl font-extrabold text-primary">{activeCount}</p>
        </div>
        <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Teslim edildi</p>
          <p className="mt-2 text-3xl font-extrabold text-emerald-800">{deliveredCount}</p>
        </div>
        <div className="rounded-3xl border border-sky-100 bg-sky-50 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-700">Ödemesi alınan</p>
          <p className="mt-2 text-3xl font-extrabold text-sky-800">{paidCount}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 rounded-3xl border border-outline-soft/40 bg-white p-4 shadow-soft">
        <label className="flex items-center gap-2 text-sm font-semibold text-muted">
          <span className="shrink-0">Tarih</span>
          <input
            className="rounded-2xl border border-outline-soft/50 bg-surface-low px-4 py-3 text-sm text-ink outline-none focus:border-primary"
            type="date"
            value={tarih ?? ''}
            onChange={(e) => setTarihParam(e.target.value || undefined)}
          />
        </label>
        {tarih ? (
          <button
            className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-bold text-secondary hover:border-secondary"
            type="button"
            onClick={() => setTarihParam(undefined)}
          >
            Filtreyi kaldır
          </button>
        ) : null}
      </div>

      {loading ? <div className="mt-8 grid gap-4"><div className="h-28 rounded-3xl bg-amber-50" /><div className="h-28 rounded-3xl bg-sky-50" /></div> : null}

      {!loading && error ? <p className="mt-8 rounded-3xl bg-red-50 p-5 text-sm font-semibold text-red-700">{error}</p> : null}

      {!loading && !error && !sortedOrders.length ? (
        <div className="stitch-panel mt-10 rounded-3xl p-8 text-center">
          <h2 className="font-display text-3xl font-bold text-primary">Sipariş bulunamadı</h2>
          <p className="mt-3 text-base text-muted">
            {tarih ? 'Bu tarihte sipariş bulunamadı.' : 'Henüz siparişiniz yok.'}
          </p>
          {!tarih ? (
            <a
              className="stitch-button mt-6"
              href="/shop"
            >
              Vitrine git
            </a>
          ) : null}
        </div>
      ) : null}

      {!loading && !error && sortedOrders.length > 0 ? (
        <ul className="mt-8 grid gap-4">
          {sortedOrders.map((order) => {
            const paymentStatus = order.payments?.[0]?.status;

            return (
              <li key={order.id}>
                <a
                  className={`stitch-panel group flex flex-col justify-between gap-5 rounded-3xl border-l-4 p-5 transition hover:-translate-y-0.5 hover:shadow-ambient sm:flex-row sm:items-center ${orderAccentClass(order.status)}`}
                  href={`/siparisler/${order.id}`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-xl font-extrabold text-primary group-hover:text-primary/80">
                      {order.orderNumber}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 truncate text-sm">
                      <span className="text-stone-600">{formatOrderDate(order.createdAt)}</span>
                      <span className="text-stone-400" aria-hidden>
                        ·
                      </span>
                      <span className="text-stone-600">{order.items.length} ürün</span>
                      {paymentStatus ? (
                        <>
                          <span className="text-stone-400" aria-hidden>
                            ·
                          </span>
                          <span className={`rounded-full bg-white/75 px-2.5 py-0.5 font-semibold ${paymentStatusTextClass(paymentStatus)}`}>
                            {paymentStatusLabel(paymentStatus)}
                          </span>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <div className="shrink-0 sm:text-right">
                    <p className="text-xl font-extrabold tabular-nums text-ink">{formatTry(order.grandTotal)}</p>
                    <p className={`mt-2 inline-flex ${orderStatusBadgeClass(order.status)}`}>
                      {statusLabel(order.status)}
                    </p>
                  </div>
                </a>
              </li>
            );
          })}
        </ul>
      ) : null}
    </>
  );
}
