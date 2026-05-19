import Link from 'next/link';

import { formatAddressSnapshot } from '../../lib/deliveries/address-format';
import { formatDateTimeTurkish } from '../../lib/deliveries/datetime-format';
import { deliveryTypeLabel } from '../../lib/deliveries/delivery-type-label';
import { formatTryAmount } from '../../lib/deliveries/money-format';
import { paymentStatusBadgeClass, paymentStatusLabel } from '../../lib/deliveries/payment-status-label';
import type { DeliveryListItem } from '../../lib/deliveries/types';
import { orderStatusLabel } from '../../lib/deliveries/order-status-label';
import { DeliveryStatusBadge } from './delivery-status-badge';

function latestPaymentStatus(order: DeliveryListItem['order']): string | null {
  const row = order.payments?.[0];
  return row?.status ?? null;
}

export function DeliveryCard({ delivery }: { delivery: DeliveryListItem }): React.JSX.Element {
  const scheduled = formatDateTimeTurkish(delivery.order.scheduledAt);
  const created = formatDateTimeTurkish(delivery.order.createdAt);
  const itemCount = delivery.order._count?.items;
  const totalLabel = formatTryAmount(delivery.order.grandTotal);
  const payStatus = latestPaymentStatus(delivery.order);

  return (
    <Link
      className="block rounded-3xl border bg-white p-5 shadow-sm transition active:scale-[0.99]"
      href={`/deliveries/${delivery.id}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-[0.18em] text-stone-500">{delivery.order.orderNumber}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-900">
              {deliveryTypeLabel(delivery.order.deliveryType)}
            </span>
            {payStatus ? (
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${paymentStatusBadgeClass(payStatus)}`}>
                {paymentStatusLabel(payStatus)}
              </span>
            ) : null}
          </div>
          {scheduled ? <p className="mt-1 text-xs text-stone-500">Planlanan: {scheduled}</p> : null}
          {created ? <p className="mt-0.5 text-xs text-stone-500">Sipariş: {created}</p> : null}
          <p className="mt-1 text-xs text-stone-500">Durum: {orderStatusLabel(delivery.order.status)}</p>
          <h2 className="mt-2 text-lg font-semibold">
            {delivery.order.user.firstName} {delivery.order.user.lastName}
          </h2>
          {typeof itemCount === 'number' ? (
            <p className="mt-1 text-xs text-stone-600">
              {itemCount} kalem ürün
              {totalLabel ? ` · ${totalLabel}` : ''}
            </p>
          ) : totalLabel ? (
            <p className="mt-1 text-xs text-stone-600">{totalLabel}</p>
          ) : null}
        </div>
        <DeliveryStatusBadge status={delivery.status} />
      </div>
      <p className="mt-4 text-sm leading-6 text-stone-700">{formatAddressSnapshot(delivery.order.addressSnapshot)}</p>
      {delivery.status === 'FAILED' && delivery.failedReason ? (
        <p className="mt-2 text-sm text-red-700">Neden: {delivery.failedReason}</p>
      ) : null}
      <div className="mt-4 flex items-center justify-between gap-2 text-sm">
        <span className="text-stone-600">{delivery.order.user.phone}</span>
        <span className="shrink-0 font-medium text-amber-700">Detayı aç</span>
      </div>
    </Link>
  );
}
