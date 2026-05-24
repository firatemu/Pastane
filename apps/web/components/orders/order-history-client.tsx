'use client';
import { useAdaptivePolling } from '@pastane/ui';
import type { AdaptivePollOutcome } from '@pastane/ui';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { buildOrdersListSearch, parseTarihQueryParam } from '../../lib/orders/date-filter';
import { fetchOrders } from '../../lib/orders/queries';
import {
  ACTIVE_ORDER_STATUSES,
  orderStatusTextClass,
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

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-base text-muted">
          <span className="shrink-0">Tarih</span>
          <input
            className="rounded-lg border border-outline-soft/50 bg-surface px-3 py-2 text-base text-ink"
            type="date"
            value={tarih ?? ''}
            onChange={(e) => setTarihParam(e.target.value || undefined)}
          />
        </label>
        {tarih ? (
          <button
            className="text-base font-medium text-primary underline-offset-4 hover:underline"
            type="button"
            onClick={() => setTarihParam(undefined)}
          >
            Filtreyi kaldır
          </button>
        ) : null}
      </div>

      {loading ? <p className="mt-8 text-base text-muted">Yükleniyor…</p> : null}

      {!loading && error ? <p className="mt-8 text-base text-red-700">{error}</p> : null}

      {!loading && !error && !sortedOrders.length ? (
        <div className="mt-10">
          <p className="text-base text-muted">
            {tarih ? 'Bu tarihte sipariş bulunamadı.' : 'Henüz siparişiniz yok.'}
          </p>
          {!tarih ? (
            <a
              className="mt-4 inline-block text-base font-medium text-primary underline-offset-4 hover:underline"
              href="/shop"
            >
              Vitrine git
            </a>
          ) : null}
        </div>
      ) : null}

      {!loading && !error && sortedOrders.length > 0 ? (
        <ul className="mt-8 divide-y divide-outline-soft/30 border-t border-outline-soft/30">
          {sortedOrders.map((order) => {
            const paymentStatus = order.payments?.[0]?.status;

            return (
              <li key={order.id}>
                <a
                  className="group -mx-2 flex items-center justify-between gap-6 rounded-lg px-2 py-5 transition-colors hover:bg-surface-low/40"
                  href={`/siparisler/${order.id}`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-primary group-hover:text-primary/80">
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
                          <span className={paymentStatusTextClass(paymentStatus)}>
                            {paymentStatusLabel(paymentStatus)}
                          </span>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-base font-semibold tabular-nums text-ink">{formatTry(order.grandTotal)}</p>
                    <p className={`mt-1 text-sm font-medium ${orderStatusTextClass(order.status)}`}>
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
