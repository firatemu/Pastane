import Link from 'next/link';

import { parseAddressSnapshotLngLat } from '../../lib/deliveries/address-snapshot-coords';
import { formatAddressSnapshot } from '../../lib/deliveries/address-format';
import {
  formatDateTimeTurkish,
  formatDeliveryDuration,
} from '../../lib/deliveries/datetime-format';
import { deliveryTypeLabel } from '../../lib/deliveries/delivery-type-label';
import { formatTryAmount } from '../../lib/deliveries/money-format';
import {
  paymentStatusBadgeClass,
  paymentStatusLabel,
} from '../../lib/deliveries/payment-status-label';
import type { DeliveryListItem, DeliveryStatus } from '../../lib/deliveries/types';
import { orderStatusLabel } from '../../lib/deliveries/order-status-label';
import { DeliveryStatusBadge } from './delivery-status-badge';

const stepIndex: Record<DeliveryStatus, number> = {
  ASSIGNED: 1,
  PICKED_UP: 2,
  OUT_FOR_DELIVERY: 3,
  DELIVERED: 4,
  FAILED: 4,
};

function latestPaymentStatus(order: DeliveryListItem['order']): string | null {
  const row = order.payments?.[0];
  return row?.status ?? null;
}

export function DeliveryCard({ delivery }: { delivery: DeliveryListItem }): React.JSX.Element {
  const scheduled = formatDateTimeTurkish(delivery.order.scheduledAt);
  const created = formatDateTimeTurkish(delivery.order.createdAt);
  const pickedUp = formatDateTimeTurkish(delivery.pickedUpAt);
  const delivered = formatDateTimeTurkish(delivery.deliveredAt);
  const duration = formatDeliveryDuration(delivery.pickedUpAt, delivery.deliveredAt);
  const itemCount = delivery.order._count?.items;
  const totalLabel = formatTryAmount(delivery.order.grandTotal);
  const payStatus = latestPaymentStatus(delivery.order);
  const customer = `${delivery.order.user.firstName} ${delivery.order.user.lastName}`;
  const address = formatAddressSnapshot(delivery.order.addressSnapshot);
  const navCoords =
    delivery.order.deliveryType === 'HOME_DELIVERY'
      ? parseAddressSnapshotLngLat(delivery.order.addressSnapshot)
      : null;
  const phoneClean = delivery.order.user.phone.replace(/\s+/g, '');
  const progress = stepIndex[delivery.status];

  return (
    <article className="overflow-hidden rounded-[1.5rem] border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="grid gap-0 lg:grid-cols-[1fr_260px]">
        <Link className="block p-4 sm:p-5" href={`/deliveries/${delivery.id}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                {delivery.order.orderNumber}
              </p>
              <h2 className="mt-2 text-xl font-semibold text-stone-950">{customer}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-semibold text-violet-900">
                  {deliveryTypeLabel(delivery.order.deliveryType)}
                </span>
                {payStatus ? (
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${paymentStatusBadgeClass(payStatus)}`}
                  >
                    {paymentStatusLabel(payStatus)}
                  </span>
                ) : null}
              </div>
            </div>
            <DeliveryStatusBadge status={delivery.status} />
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            <MiniFact
              label="Ürün"
              value={typeof itemCount === 'number' ? `${itemCount} kalem` : 'Belirsiz'}
            />
            <MiniFact label="Tutar" value={totalLabel ?? 'Tutar yok'} />
            <MiniFact label="Sipariş" value={created ?? 'Tarih yok'} />
            <MiniFact
              label="Süre"
              value={duration ?? (scheduled ? `Plan: ${scheduled}` : 'Plan yok')}
            />
          </div>

          <div className="mt-4">
            <div className="grid grid-cols-4 gap-2">
              {['Atandı', 'Alındı', 'Yolda', delivery.status === 'FAILED' ? 'Sorun' : 'Teslim'].map(
                (label, index) => (
                  <div key={label}>
                    <div
                      className={`h-2 rounded-full ${
                        delivery.status === 'FAILED' && index === 3
                          ? 'bg-red-600'
                          : index + 1 <= progress
                            ? 'bg-amber-500'
                            : 'bg-stone-200'
                      }`}
                    />
                    <p className="mt-1 truncate text-[11px] text-stone-500">{label}</p>
                  </div>
                ),
              )}
            </div>
          </div>

          <p className="mt-4 text-sm leading-6 text-stone-700">{address}</p>
          {delivery.status === 'FAILED' && delivery.failedReason ? (
            <p className="mt-2 rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-800">
              Neden: {delivery.failedReason}
            </p>
          ) : null}
        </Link>

        <div className="border-t border-stone-100 bg-stone-50 p-4 lg:border-l lg:border-t-0">
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
            <a
              className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-green-700 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-800"
              href={`tel:${phoneClean}`}
            >
              Müşteriyi ara
            </a>
            {navCoords ? (
              <a
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-900"
                href={`https://www.google.com/maps/dir/?api=1&destination=${navCoords.lat},${navCoords.lng}`}
                rel="noopener noreferrer"
                target="_blank"
              >
                Yol tarifi
              </a>
            ) : (
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-900"
                href={`/deliveries/${delivery.id}`}
              >
                Detay
              </Link>
            )}
          </div>
          <div className="mt-4 space-y-1 text-xs text-stone-600">
            <p>
              Sipariş:{' '}
              <span className="font-medium text-stone-900">
                {orderStatusLabel(delivery.order.status)}
              </span>
            </p>
            {pickedUp ? <p>Teslim alındı: {pickedUp}</p> : null}
            {delivered ? <p>Teslim edildi: {delivered}</p> : null}
            <p>Telefon: {delivery.order.user.phone}</p>
          </div>
        </div>
      </div>
    </article>
  );
}

function MiniFact({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="rounded-2xl bg-stone-50 px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-stone-500">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-stone-950">{value}</p>
    </div>
  );
}
