'use client';

import { formatTry } from '../../lib/format/format-try';
import { useEffect, useState } from 'react';
import { adminFetch } from '../../lib/api/catalog';
import { adminMessageFromUnknownError } from '../../lib/messages/admin-facing-errors';
import { STATUS_LABELS } from '../../lib/operations/status';
import type { OrderDetail, OrderStatus } from '../../lib/operations/types';
import { PageSection } from '../shared/page-section';
import { StatusBadge } from '../shared/status-badge';
import { formatAddressSnapshot } from '../../lib/maps/format-address-snapshot';
import { parseAddressSnapshotLngLat } from '../../lib/maps/address-snapshot-coords';
import { OrderDetailCourierAssignment } from './order-detail-courier-assignment';
import { OrderStatusActions } from './order-status-actions';
import { ErrorState, LoadingState } from '../shared/async-state';

export function OrderDetailPanel({
  id,
  permissions,
}: {
  id: string;
  permissions: string[];
}): React.JSX.Element {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load(): Promise<void> {
    try {
      setError(null);
      setOrder(await adminFetch<OrderDetail>(`/orders/${id}`));
    } catch (e) {
      setError(adminMessageFromUnknownError(e, 'Sipariş yüklenemedi.'));
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  if (error) return <ErrorState message={error} />;
  if (!order) return <LoadingState label="Sipariş yükleniyor…" />;

  const homeCoords =
    order.deliveryType === 'HOME_DELIVERY' ? parseAddressSnapshotLngLat(order.addressSnapshot) : null;

  return (
    <PageSection title={`Sipariş ${order.orderNumber}`}>
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <section className="space-y-4 rounded-3xl border bg-white p-5">
          <div className="flex items-center justify-between">
            <StatusBadge status={order.status} />
            <span className="font-semibold">{formatTry(order.grandTotal)}</span>
          </div>
          <div className="space-y-2">
            {order.items.map((i) => (
              <article className="rounded-2xl bg-stone-50 p-3" key={i.id}>
                <div className="font-medium">
                  {i.productNameSnapshot} × {i.quantity}
                </div>
                <div className="text-sm text-stone-600">
                  {i.options.map((o) => o.optionNameSnapshot).join(', ') || 'Opsiyon yok'}
                </div>
              </article>
            ))}
          </div>
          <OrderStatusActions
            orderId={order.id}
            status={order.status}
            payments={order.payments}
            permissions={permissions}
            onChanged={load}
          />
          {order.deliveryType === 'HOME_DELIVERY' ? (
            <div className="rounded-3xl border border-stone-200 bg-stone-50 p-4 text-sm">
              <h2 className="font-semibold text-stone-900">Teslimat adresi</h2>
              <p className="mt-2 leading-6 text-stone-700">{formatAddressSnapshot(order.addressSnapshot)}</p>
              {homeCoords ? (
                <>
                  <p className="mt-2 font-mono text-xs text-stone-600">
                    Enlem {homeCoords.lat.toFixed(6)} · Boylam {homeCoords.lng.toFixed(6)}
                  </p>
                  <a
                    className="mt-3 inline-flex rounded-2xl border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-900 underline-offset-2 hover:underline"
                    href={`https://www.openstreetmap.org/?mlat=${homeCoords.lat}&mlon=${homeCoords.lng}&zoom=17`}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Haritada Aç
                  </a>
                </>
              ) : (
                <p className="mt-3 text-xs text-stone-500">Konum bilgisi yok</p>
              )}
            </div>
          ) : null}
        </section>
        <aside className="space-y-4">
          <OrderDetailCourierAssignment order={order} permissions={permissions} onChanged={load} />
          <div className="space-y-4 rounded-3xl border bg-white p-5">
            <h2 className="font-semibold">Zaman çizelgesi</h2>
            {order.statusHistory.map((h) => (
              <div className="text-sm" key={h.id}>
                <div>{STATUS_LABELS[h.status as OrderStatus] ?? h.status}</div>
                {h.note ? <div className="mt-0.5 text-stone-700">{h.note}</div> : null}
                <div className="text-stone-500">{new Date(h.createdAt).toLocaleString('tr-TR')}</div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </PageSection>
  );
}
