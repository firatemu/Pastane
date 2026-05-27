'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useAdaptivePolling } from '@pastane/ui';
import type { AdaptivePollOutcome } from '@pastane/ui';

import { getDelivery } from '../../lib/api/deliveries';
import { courierMessageFromUnknownError } from '../../lib/deliveries/courier-api-error';
import { parseAddressSnapshotLngLat } from '../../lib/deliveries/address-snapshot-coords';
import { formatAddressSnapshot } from '../../lib/deliveries/address-format';
import { formatDateTimeTurkish, formatDeliveryDuration } from '../../lib/deliveries/datetime-format';
import { deliveryTypeLabel } from '../../lib/deliveries/delivery-type-label';
import { orderLineTotalTry } from '../../lib/deliveries/line-total';
import { formatTryAmount } from '../../lib/deliveries/money-format';
import { orderStatusLabel } from '../../lib/deliveries/order-status-label';
import { paymentStatusBadgeClass, paymentStatusLabel } from '../../lib/deliveries/payment-status-label';
import type { DeliveryDetail } from '../../lib/deliveries/types';
import { orderItemOptionKey } from '../../lib/deliveries/types';
import { DeliveryActions } from './delivery-actions';
import { DeliveryStatusBadge } from './delivery-status-badge';
import { ErrorState, LoadingState } from '../shared/async-state';
import { PollingNote } from '../shared/polling-note';

function latestPaymentStatus(order: DeliveryDetail['order']): string | null {
  return order.payments?.[0]?.status ?? null;
}

/* ─────────────────────── Panel Bileşenleri ─────────────────────── */

function SectionCard({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <div className={`rounded-xl border border-stone-200 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}): React.JSX.Element {
  return (
    <div className="flex items-start gap-3 border-b border-stone-100 px-4 py-3 sm:px-5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-stone-100">
        <svg className="h-4 w-4 text-stone-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          {icon}
        </svg>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-stone-900">{title}</h3>
        {subtitle ? <p className="text-xs text-stone-500">{subtitle}</p> : null}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-xs text-stone-500">{label}</span>
      <span className="text-sm font-medium text-stone-900">{value}</span>
    </div>
  );
}

function MetricTile({
  icon,
  label,
  value,
  color = 'stone',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color?: 'amber' | 'emerald' | 'sky' | 'stone';
}): React.JSX.Element {
  const colorMap = {
    amber: 'bg-amber-50 border-amber-100',
    emerald: 'bg-emerald-50 border-emerald-100',
    sky: 'bg-sky-50 border-sky-100',
    stone: 'bg-stone-50 border-stone-200',
  };
  const iconColorMap = {
    amber: 'text-amber-600',
    emerald: 'text-emerald-600',
    sky: 'text-sky-600',
    stone: 'text-stone-500',
  };
  return (
    <div className={`rounded-lg border p-3 ${colorMap[color]}`}>
      <div className="flex items-center gap-1.5">
        <svg className={`h-3.5 w-3.5 ${iconColorMap[color]}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          {icon}
        </svg>
        <span className="text-[10px] font-medium uppercase tracking-wider text-stone-500">{label}</span>
      </div>
      <p className="mt-1.5 text-lg font-bold text-stone-900">{value}</p>
    </div>
  );
}

/* ─────────────────────── Ana Panel ─────────────────────── */

export function DeliveryDetailPanel({ id }: { id: string }): React.JSX.Element {
  const [delivery, setDelivery] = useState<DeliveryDetail | null>(null);
  const deliveryRef = useRef<DeliveryDetail | null>(null);
  const fetchGeneration = useRef(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [pollWarning, setPollWarning] = useState<string | null>(null);

  useEffect(() => {
    deliveryRef.current = delivery;
  }, [delivery]);

  useEffect(() => {
    fetchGeneration.current += 1;
    setLoading(true);
    setDelivery(null);
    setError(null);
    setPollWarning(null);
  }, [id]);

  const pollTick = useCallback(async (): Promise<AdaptivePollOutcome> => {
    const gen = fetchGeneration.current;
    try {
      setPollWarning(null);
      setError(null);
      const next = await getDelivery(id);
      if (gen !== fetchGeneration.current) return 'ok';
      setDelivery(next);
      setLastRefreshedAt(new Date());
      return 'ok';
    } catch (caught) {
      if (gen !== fetchGeneration.current) return 'ok';
      setError(courierMessageFromUnknownError(caught, 'Teslimat yüklenemedi.'));
      if (deliveryRef.current != null) {
        setPollWarning('Güncelleme başarısız. Bilgiler son başarılı yüklemeye göre.');
      }
      return 'error';
    } finally {
      if (gen === fetchGeneration.current) {
        setLoading(false);
      }
    }
  }, [id]);

  useAdaptivePolling({ poll: pollTick, immediate: true, baseIntervalMs: 15_000 });

  const load = useCallback(async () => {
    await pollTick();
  }, [pollTick]);

  if (loading && !delivery) return <LoadingState label="Teslimat yükleniyor…" />;
  if (error && !delivery) return <ErrorState message={error} />;
  if (!delivery) return <ErrorState message="Teslimat bulunamadı." />;

  const pickedUp = formatDateTimeTurkish(delivery.pickedUpAt);
  const delivered = formatDateTimeTurkish(delivery.deliveredAt);
  const scheduled = formatDateTimeTurkish(delivery.order.scheduledAt);
  const orderCreated = formatDateTimeTurkish(delivery.order.createdAt);
  const orderUpdated = formatDateTimeTurkish(delivery.order.updatedAt);
  const deliveryUpdated = formatDateTimeTurkish(delivery.updatedAt);
  const duration = formatDeliveryDuration(delivery.pickedUpAt, delivery.deliveredAt);
  const navCoords =
    delivery.order.deliveryType === 'HOME_DELIVERY'
      ? parseAddressSnapshotLngLat(delivery.order.addressSnapshot)
      : null;
  const payStatus = latestPaymentStatus(delivery.order);
  const phoneClean = delivery.order.user.phone.replace(/\s+/g, '');
  const customerName = `${delivery.order.user.firstName} ${delivery.order.user.lastName}`;
  const grandTotalLabel = formatTryAmount(delivery.order.grandTotal);
  const subtotalLabel = formatTryAmount(delivery.order.subtotal);
  const deliveryFeeLabel = formatTryAmount(delivery.order.deliveryFee);
  const serviceFeeLabel = formatTryAmount(delivery.order.serviceFee);
  const loyaltyDiscountLabel = formatTryAmount(delivery.order.loyaltyDiscount);
  const isFailed = delivery.status === 'FAILED';
  const isTerminal = delivery.status === 'DELIVERED' || delivery.status === 'FAILED';

  const history = [...delivery.order.statusHistory].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <section className="space-y-4 px-3 py-4 sm:px-4 lg:px-0">
      {/* ─── Üst Başlık ─── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-500 transition hover:text-stone-900"
            href="/deliveries"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Teslimatlara dön
          </Link>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-stone-900 sm:text-2xl">
              {delivery.order.orderNumber}
            </h1>
            <DeliveryStatusBadge status={delivery.status} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <PollingNote seconds={15} lastRefreshedAt={lastRefreshedAt} pollWarning={pollWarning} />
          <a
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700"
            href={`tel:${phoneClean}`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
            </svg>
            <span className="hidden sm:inline">Müşteriyi ara</span>
            <span className="sm:hidden">Ara</span>
          </a>
        </div>
      </div>

      {/* ─── Ana İçerik ─── */}
      <div className="grid gap-4 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_380px]">
        {/* Sol Kolon */}
        <div className="space-y-4 min-w-0">
          {/* Müşteri & Durum Kartı */}
          <SectionCard>
            <div className="p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center rounded-md bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700 ring-1 ring-inset ring-violet-600/20">
                      {deliveryTypeLabel(delivery.order.deliveryType)}
                    </span>
                    {payStatus ? (
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${paymentStatusBadgeClass(payStatus)}`}>
                        {paymentStatusLabel(payStatus)}
                      </span>
                    ) : null}
                    <span className="inline-flex items-center rounded-md bg-stone-50 px-2 py-0.5 text-[11px] font-medium text-stone-600 ring-1 ring-inset ring-stone-500/10">
                      {orderStatusLabel(delivery.order.status)}
                    </span>
                  </div>
                  <h2 className="mt-2 text-lg font-bold text-stone-900 sm:text-xl">{customerName}</h2>
                  <p className="mt-1 text-sm text-stone-500">
                    {scheduled ? `Planlanan: ${scheduled}` : `Sipariş: ${orderCreated ?? '—'}`}
                  </p>
                </div>
              </div>

              {/* Metrikler */}
              <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
                <MetricTile
                  icon={<path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />}
                  label="Toplam"
                  value={grandTotalLabel ?? '—'}
                  color="amber"
                />
                <MetricTile
                  icon={<path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />}
                  label="Kalem"
                  value={`${delivery.order.items.length} adet`}
                  color="sky"
                />
                <MetricTile
                  icon={<path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />}
                  label="Süre"
                  value={duration ?? 'Devam ediyor'}
                  color={duration ? 'emerald' : 'stone'}
                />
              </div>
            </div>
          </SectionCard>

          {/* Başarısızlık / Not */}
          {isFailed && delivery.failedReason ? (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <svg className="mt-0.5 h-5 w-5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-red-600">Başarısızlık nedeni</p>
                <p className="mt-1 text-sm text-red-800">{delivery.failedReason}</p>
              </div>
            </div>
          ) : null}

          {delivery.order.note ? (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <svg className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
              </svg>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Sipariş notu</p>
                <p className="mt-1 text-sm text-amber-900">{delivery.order.note}</p>
              </div>
            </div>
          ) : null}

          {/* Teslimat Adresi */}
          <SectionCard>
            <SectionHeader
              icon={<path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />}
              title="Teslimat Adresi"
              subtitle="Rota bilgileri"
            />
            <div className="p-4 sm:p-5">
              <div className="flex items-start gap-2.5 rounded-lg bg-stone-50 p-3">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                </svg>
                <p className="text-sm leading-relaxed text-stone-700">
                  {formatAddressSnapshot(delivery.order.addressSnapshot)}
                </p>
              </div>
              {delivery.order.deliveryType === 'HOME_DELIVERY' && navCoords ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <a
                    className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700"
                    href={`https://www.google.com/maps/dir/?api=1&destination=${navCoords.lat},${navCoords.lng}`}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
                    </svg>
                    Google Maps
                  </a>
                  <a
                    className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 text-sm font-medium text-stone-700 shadow-sm transition hover:bg-stone-50"
                    href={`https://yandex.com/maps/?rtext=~${navCoords.lat},${navCoords.lng}&rtt=auto`}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
                    </svg>
                    Yandex Navi
                  </a>
                </div>
              ) : delivery.order.deliveryType === 'HOME_DELIVERY' ? (
                <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Bu sipariş için harita konumu bulunmuyor.
                </p>
              ) : null}
            </div>
          </SectionCard>

          {/* Ürünler */}
          <SectionCard>
            <SectionHeader
              icon={<path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />}
              title="Sipariş Ürünleri"
              subtitle={`${delivery.order.items.length} kalem`}
            />
            <div className="divide-y divide-stone-100 px-4 sm:px-5">
              {delivery.order.items.map((item) => {
                const line = orderLineTotalTry(item);
                const lineLabel = formatTryAmount(String(line));
                const unitLabel = formatTryAmount(item.unitPriceSnapshot);
                return (
                  <article className="py-3 first:pt-0 last:pb-0" key={item.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-semibold text-stone-900">{item.productNameSnapshot}</h4>
                        <p className="mt-0.5 text-xs text-stone-500">
                          {item.quantity} adet{unitLabel ? ` · Birim ${unitLabel}` : ''}
                        </p>
                      </div>
                      {lineLabel ? <p className="shrink-0 text-sm font-bold text-stone-900">{lineLabel}</p> : null}
                    </div>
                    {item.customNote ? (
                      <div className="mt-2 flex items-start gap-1.5 rounded-md bg-stone-50 px-2.5 py-1.5">
                        <svg className="mt-0.5 h-3 w-3 shrink-0 text-stone-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                        </svg>
                        <p className="text-xs text-stone-600">{item.customNote}</p>
                      </div>
                    ) : null}
                    {item.options.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {item.options.map((option) => (
                          <span className="inline-flex items-center rounded-md bg-stone-100 px-2 py-0.5 text-[11px] text-stone-600" key={orderItemOptionKey(option)}>
                            {option.optionNameSnapshot}
                            {formatTryAmount(option.priceModifierSnapshot) ? ` +${formatTryAmount(option.priceModifierSnapshot)}` : ''}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </SectionCard>
        </div>

        {/* Sağ Kolon */}
        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          {/* Sıradaki İşlem */}
          <SectionCard className={isTerminal ? '' : 'border-amber-200'}>
            <SectionHeader
              icon={<path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />}
              title="Sıradaki İşlem"
              subtitle={isTerminal ? 'İşlem kalmadı' : 'Teslimat aksiyonu'}
            />
            <div className="p-4 sm:p-5">
              <DeliveryActions delivery={delivery} onChanged={load} onError={setError} />
              {isTerminal ? (
                <p className="rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-500">
                  Bu teslimat için aktif işlem kalmadı.
                </p>
              ) : null}
            </div>
          </SectionCard>

          {/* Müşteri Bilgisi */}
          <SectionCard>
            <SectionHeader
              icon={<path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />}
              title="Müşteri Bilgisi"
            />
            <div className="space-y-0 px-4 pb-3 pt-1 sm:px-5">
              <InfoRow label="Ad soyad" value={customerName} />
              <InfoRow
                label="Telefon"
                value={
                  <a className="font-medium text-emerald-700 underline-offset-2 hover:underline" href={`tel:${phoneClean}`}>
                    {delivery.order.user.phone}
                  </a>
                }
              />
              <InfoRow label="Sipariş tipi" value={deliveryTypeLabel(delivery.order.deliveryType)} />
            </div>
          </SectionCard>

          {/* Tutar Özeti */}
          {(subtotalLabel || grandTotalLabel) && (
            <SectionCard>
              <SectionHeader
                icon={<path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />}
                title="Tutar Özeti"
              />
              <div className="space-y-0 px-4 pb-3 pt-1 sm:px-5">
                {subtotalLabel ? <InfoRow label="Ara toplam" value={subtotalLabel} /> : null}
                {deliveryFeeLabel && Number(delivery.order.deliveryFee) > 0 ? (
                  <InfoRow label="Teslimat" value={deliveryFeeLabel} />
                ) : null}
                {serviceFeeLabel && Number(delivery.order.serviceFee ?? 0) > 0 ? (
                  <InfoRow label="Hizmet" value={serviceFeeLabel} />
                ) : null}
                {loyaltyDiscountLabel && Number(delivery.order.loyaltyDiscount) > 0 ? (
                  <InfoRow label="Sadakat indirimi" value={<span className="text-emerald-700">-{loyaltyDiscountLabel}</span>} />
                ) : null}
                {(delivery.order.loyaltyPointsUsed ?? 0) > 0 ? (
                  <InfoRow label="Kullanılan puan" value={String(delivery.order.loyaltyPointsUsed)} />
                ) : null}
                {grandTotalLabel ? (
                  <div className="mt-2 flex items-center justify-between gap-3 border-t border-stone-100 pt-2">
                    <span className="text-sm font-semibold text-stone-900">Genel toplam</span>
                    <span className="text-lg font-bold text-stone-900">{grandTotalLabel}</span>
                  </div>
                ) : null}
                <p className="mt-2 text-[10px] text-stone-400">Kart bilgisi gösterilmez.</p>
              </div>
            </SectionCard>
          )}

          {/* Zamanlar */}
          <SectionCard>
            <SectionHeader
              icon={<path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />}
              title="Zamanlar"
            />
            <div className="space-y-0 px-4 pb-3 pt-1 sm:px-5">
              {orderCreated ? <InfoRow label="Sipariş oluşturuldu" value={orderCreated} /> : null}
              {pickedUp ? <InfoRow label="Teslim alındı" value={pickedUp} /> : null}
              {delivered ? <InfoRow label="Teslim edildi" value={delivered} /> : null}
              {orderUpdated ? <InfoRow label="Sipariş güncellendi" value={orderUpdated} /> : null}
              {deliveryUpdated ? <InfoRow label="Teslimat güncellendi" value={deliveryUpdated} /> : null}
            </div>
          </SectionCard>

          {/* Zaman Çizelgesi */}
          {history.length > 0 ? (
            <SectionCard>
              <SectionHeader
                icon={<path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />}
                title="Zaman Çizelgesi"
                subtitle={`${history.length} kayıt`}
              />
              <div className="max-h-80 overflow-y-auto px-4 pb-3 pt-1 sm:px-5">
                <ol className="relative ml-2 border-l-2 border-stone-200">
                  {history.map((row, index) => (
                    <li className="ml-4 pb-3 last:pb-0" key={row.id}>
                      <div className={`absolute -left-[9px] mt-1 h-3.5 w-3.5 rounded-full border-2 border-white ${
                        index === 0 ? 'bg-amber-500' : 'bg-stone-300'
                      }`} />
                      <p className="text-sm font-medium text-stone-900">{orderStatusLabel(row.status)}</p>
                      <p className="text-xs text-stone-500">{formatDateTimeTurkish(row.createdAt) ?? row.createdAt}</p>
                      {row.note ? <p className="mt-0.5 text-xs text-stone-600">{row.note}</p> : null}
                    </li>
                  ))}
                </ol>
              </div>
            </SectionCard>
          ) : null}
        </aside>
      </div>

      {error ? (
        <div className="mt-2">
          <ErrorState message={error} />
        </div>
      ) : null}
    </section>
  );
}