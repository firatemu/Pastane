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

const stepConfig: { label: string; icon: React.ReactNode }[] = [
  {
    label: 'Atandı',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
    ),
  },
  {
    label: 'Alındı',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
    ),
  },
  {
    label: 'Yolda',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25m-3.75 0V5.625m0 12.75v-2.25m0-5.625v2.25m0-2.25H5.625c-.621 0-1.125.504-1.125 1.125v5.25c0 .621.504 1.125 1.125 1.125m5.625-7.5h3.75m-3.75 0V5.625m0 0A2.625 2.625 0 0 1 13.875 3h.375a2.625 2.625 0 0 1 2.625 2.625V5.625m0 0h1.5" />
    ),
  },
  {
    label: 'Teslim',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    ),
  },
];

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
  const isFailed = delivery.status === 'FAILED';

  return (
    <article className="group overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm transition-all hover:-translate-y-px hover:border-stone-300 hover:shadow-md">
      <div className="grid gap-0 lg:grid-cols-[1fr_240px]">
        {/* Sol: Ana içerik */}
        <Link className="block p-4 sm:p-5" href={`/deliveries/${delivery.id}`}>
          {/* Üst satır: Sipariş no + durum */}
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-stone-400">#</span>
                <span className="text-sm font-semibold text-stone-700">{delivery.order.orderNumber}</span>
              </div>
              <h2 className="mt-1.5 text-lg font-semibold text-stone-900">{customer}</h2>
            </div>
            <DeliveryStatusBadge status={delivery.status} />
          </div>

          {/* Etiketler */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center rounded-md bg-violet-50 px-2 py-1 text-[11px] font-medium text-violet-700 ring-1 ring-inset ring-violet-600/20">
              {deliveryTypeLabel(delivery.order.deliveryType)}
            </span>
            {payStatus ? (
              <span
                className={`inline-flex items-center rounded-md px-2 py-1 text-[11px] font-medium ring-1 ring-inset ${paymentStatusBadgeClass(payStatus)}`}
              >
                {paymentStatusLabel(payStatus)}
              </span>
            ) : null}
            <span className="inline-flex items-center rounded-md bg-stone-50 px-2 py-1 text-[11px] font-medium text-stone-600 ring-1 ring-inset ring-stone-500/10">
              {orderStatusLabel(delivery.order.status)}
            </span>
          </div>

          {/* Bilgi grid */}
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <FactChip
              icon={<path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007Z" />}
              label="Ürün"
              value={typeof itemCount === 'number' ? `${itemCount} kalem` : '—'}
            />
            <FactChip
              icon={<path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />}
              label="Tutar"
              value={totalLabel ?? '—'}
            />
            <FactChip
              icon={<path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />}
              label="Sipariş"
              value={created ?? '—'}
            />
            <FactChip
              icon={<path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />}
              label="Süre"
              value={duration ?? (scheduled ? `Plan: ${scheduled}` : '—')}
            />
          </div>

          {/* İlerleme çubuğu */}
          <div className="mt-4">
            <div className="flex items-center gap-1">
              {stepConfig.map((step, index) => {
                const isActive = index + 1 <= progress;
                const isCurrentStep = index + 1 === progress;
                const isFailedStep = isFailed && index === 3;
                return (
                  <div key={step.label} className="flex flex-1 items-center gap-1.5">
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors ${
                        isFailedStep
                          ? 'bg-red-100 text-red-600'
                          : isActive
                            ? isCurrentStep
                              ? 'bg-amber-500 text-white shadow-sm shadow-amber-200'
                              : 'bg-amber-100 text-amber-700'
                            : 'bg-stone-100 text-stone-400'
                      }`}
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        {step.icon}
                      </svg>
                    </div>
                    {index < stepConfig.length - 1 && (
                      <div
                        className={`h-0.5 flex-1 rounded-full transition-colors ${
                          isFailedStep
                            ? 'bg-red-300'
                            : isActive && index + 1 < progress
                              ? 'bg-amber-400'
                              : 'bg-stone-200'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex justify-between px-0.5">
              {stepConfig.map((step) => (
                <span key={step.label} className="w-0 flex-1 text-center text-[10px] text-stone-400">
                  {step.label}
                </span>
              ))}
            </div>
          </div>

          {/* Adres */}
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-stone-50 px-3 py-2.5">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
            </svg>
            <p className="text-sm leading-relaxed text-stone-600">{address}</p>
          </div>

          {/* Başarısız nedeni */}
          {isFailed && delivery.failedReason ? (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
              <p className="text-sm text-red-700">
                <span className="font-medium">Neden:</span> {delivery.failedReason}
              </p>
            </div>
          ) : null}
        </Link>

        {/* Sağ: Aksiyon paneli */}
        <div className="border-t border-stone-100 bg-stone-50/50 p-4 lg:border-l lg:border-t-0">
          {/* Aksiyon butonları */}
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
            <a
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
              href={`tel:${phoneClean}`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
              </svg>
              Ara
            </a>
            {navCoords ? (
              <a
                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 text-sm font-medium text-stone-700 shadow-sm transition hover:bg-stone-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-400"
                href={`https://www.google.com/maps/dir/?api=1&destination=${navCoords.lat},${navCoords.lng}`}
                rel="noopener noreferrer"
                target="_blank"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
                </svg>
                Yol tarifi
              </a>
            ) : (
              <Link
                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 text-sm font-medium text-stone-700 shadow-sm transition hover:bg-stone-50"
                href={`/deliveries/${delivery.id}`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
                Detay
              </Link>
            )}
          </div>

          {/* Bilgi notları */}
          <div className="mt-4 space-y-1.5 border-t border-stone-200 pt-3">
            <InfoLine label="Ödeme" value={payStatus ? paymentStatusLabel(payStatus) : 'Kayıt yok'} />
            {pickedUp ? <InfoLine label="Alındı" value={pickedUp} /> : null}
            {delivered ? <InfoLine label="Teslim" value={delivered} /> : null}
            <InfoLine label="Telefon" value={delivery.order.user.phone} />
          </div>
        </div>
      </div>
    </article>
  );
}

function FactChip({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}): React.JSX.Element {
  return (
    <div className="rounded-lg bg-stone-50 px-3 py-2">
      <div className="flex items-center gap-1.5">
        <svg className="h-3.5 w-3.5 text-stone-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          {icon}
        </svg>
        <span className="text-[10px] font-medium uppercase tracking-wider text-stone-400">{label}</span>
      </div>
      <p className="mt-1 truncate text-sm font-semibold text-stone-900">{value}</p>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-stone-400">{label}</span>
      <span className="font-medium text-stone-700">{value}</span>
    </div>
  );
}