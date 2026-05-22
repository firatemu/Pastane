'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

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

function InfoTile({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: React.ReactNode;
  tone?: 'default' | 'dark' | 'success';
}): React.JSX.Element {
  const toneClass =
    tone === 'dark'
      ? 'border-amber-200 bg-amber-50 text-amber-950'
      : tone === 'success'
        ? 'border-green-100 bg-green-50 text-green-950'
        : 'border-stone-200 bg-white text-stone-950';

  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClass}`}>
      <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${tone === 'dark' ? 'text-amber-700' : 'text-stone-500'}`}>
        {label}
      </p>
      <div className="mt-1 text-base font-semibold leading-6">{value}</div>
    </div>
  );
}

function DetailSection({
  children,
  eyebrow,
  title,
}: {
  children: React.ReactNode;
  eyebrow?: string;
  title: string;
}): React.JSX.Element {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
      {eyebrow ? <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">{eyebrow}</p> : null}
      <h2 className="text-lg font-semibold tracking-tight text-stone-950">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

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

  const load = useCallback(async () => {
    const gen = fetchGeneration.current;
    try {
      setPollWarning(null);
      setError(null);
      const next = await getDelivery(id);
      if (gen !== fetchGeneration.current) return;
      setDelivery(next);
      setLastRefreshedAt(new Date());
    } catch (caught) {
      if (gen !== fetchGeneration.current) return;
      setError(courierMessageFromUnknownError(caught, 'Teslimat yüklenemedi.'));
      if (deliveryRef.current != null) {
        setPollWarning('Güncelleme başarısız. Bilgiler son başarılı yüklemeye göre.');
      }
    } finally {
      if (gen === fetchGeneration.current) {
        setLoading(false);
      }
    }
  }, [id]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 15_000);
    return () => clearInterval(timer);
  }, [load]);

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

  const history = [...delivery.order.statusHistory].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <section className="space-y-5 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <a className="text-sm font-semibold text-stone-600 underline-offset-4 hover:text-stone-950 hover:underline" href="/deliveries">
            Teslimatlara dön
          </a>
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500">Teslimat detayı</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">{delivery.order.orderNumber}</h1>
        </div>
        <PollingNote seconds={15} lastRefreshedAt={lastRefreshedAt} pollWarning={pollWarning} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <DeliveryStatusBadge status={delivery.status} />
                  <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-800">
                    {deliveryTypeLabel(delivery.order.deliveryType)}
                  </span>
                  {payStatus ? (
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${paymentStatusBadgeClass(payStatus)}`}>
                      Ödeme: {paymentStatusLabel(payStatus)}
                    </span>
                  ) : null}
                </div>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight text-stone-950">{customerName}</h2>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  Sipariş durumu <span className="font-semibold text-stone-900">{orderStatusLabel(delivery.order.status)}</span>
                  {scheduled ? ` · Planlanan ${scheduled}` : ''}
                </p>
              </div>
              <a
                className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-green-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-800"
                href={`tel:${phoneClean}`}
              >
                Ara: {delivery.order.user.phone}
              </a>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <InfoTile label="Toplam" value={grandTotalLabel ?? 'Tutar yok'} tone="dark" />
              <InfoTile label="Ürün satırı" value={`${delivery.order.items.length} kalem`} />
              <InfoTile label="Süre" value={duration ?? 'Devam ediyor'} tone={duration ? 'success' : 'default'} />
            </div>
          </section>

          {delivery.status === 'FAILED' && delivery.failedReason ? (
            <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-950 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-red-800">Başarısızlık nedeni</p>
              <p className="mt-2 leading-6">{delivery.failedReason}</p>
            </section>
          ) : null}

          {delivery.order.note ? (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-800">Sipariş notu</p>
              <p className="mt-2 leading-6">{delivery.order.note}</p>
            </section>
          ) : null}

          <DetailSection eyebrow="Rota" title="Teslimat adresi">
            <p className="text-base leading-7 text-stone-800">{formatAddressSnapshot(delivery.order.addressSnapshot)}</p>
            {delivery.order.deliveryType === 'HOME_DELIVERY' && navCoords ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <a
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-green-700 bg-green-700 px-4 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-green-800"
                  href={`https://www.google.com/maps/dir/?api=1&destination=${navCoords.lat},${navCoords.lng}`}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Google Maps
                </a>
                <a
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-stone-300 bg-white px-4 py-3 text-center text-sm font-semibold text-stone-950 shadow-sm transition hover:bg-stone-50"
                  href={`https://yandex.com/maps/?rtext=~${navCoords.lat},${navCoords.lng}&rtt=auto`}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Yandex Navi
                </a>
              </div>
            ) : delivery.order.deliveryType === 'HOME_DELIVERY' ? (
              <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">Bu sipariş için harita konumu bulunmuyor.</p>
            ) : null}
          </DetailSection>

          <DetailSection title="Ürünler">
            <div className="divide-y divide-stone-100">
              {delivery.order.items.map((item) => {
                const line = orderLineTotalTry(item);
                const lineLabel = formatTryAmount(String(line));
                const unitLabel = formatTryAmount(item.unitPriceSnapshot);
                return (
                  <article className="py-4 first:pt-0 last:pb-0" key={item.id}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="font-semibold leading-6 text-stone-950">{item.productNameSnapshot}</h3>
                        <p className="mt-1 text-sm text-stone-600">
                          {item.quantity} adet{unitLabel ? ` · Birim ${unitLabel}` : ''}
                        </p>
                      </div>
                      {lineLabel ? <p className="shrink-0 text-sm font-semibold text-stone-950">{lineLabel}</p> : null}
                    </div>
                    {item.customNote ? <p className="mt-3 rounded-xl bg-stone-50 px-3 py-2 text-sm text-stone-700">Not: {item.customNote}</p> : null}
                    {item.options.length > 0 ? (
                      <ul className="mt-3 flex flex-wrap gap-2 text-xs text-stone-700">
                        {item.options.map((option) => (
                          <li className="rounded-full bg-stone-100 px-3 py-1" key={orderItemOptionKey(option)}>
                            {option.optionNameSnapshot}
                            {formatTryAmount(option.priceModifierSnapshot) ? ` +${formatTryAmount(option.priceModifierSnapshot)}` : ''}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </DetailSection>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-stone-950 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">Sıradaki işlem</p>
            <div className="mt-4">
              <DeliveryActions delivery={delivery} onChanged={load} onError={setError} />
              {delivery.status === 'DELIVERED' || delivery.status === 'FAILED' ? (
                <p className="rounded-2xl bg-white px-4 py-3 text-sm text-stone-600">Bu teslimat için aktif işlem kalmadı.</p>
              ) : null}
            </div>
          </section>

          <DetailSection title="Müşteri">
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-stone-500">Ad soyad</dt>
                <dd className="mt-1 font-semibold text-stone-950">{customerName}</dd>
              </div>
              <div>
                <dt className="text-stone-500">Telefon</dt>
                <dd className="mt-1">
                  <a className="font-semibold text-green-800 underline-offset-4 hover:underline" href={`tel:${phoneClean}`}>
                    {delivery.order.user.phone}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-stone-500">Sipariş tipi</dt>
                <dd className="mt-1 font-semibold text-stone-950">{deliveryTypeLabel(delivery.order.deliveryType)}</dd>
              </div>
            </dl>
          </DetailSection>

          {(subtotalLabel || grandTotalLabel || (delivery.order.loyaltyPointsUsed ?? 0) > 0) && (
            <DetailSection title="Tutar özeti">
              <dl className="space-y-2 text-sm">
                {subtotalLabel ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-stone-500">Ara toplam</dt>
                    <dd className="font-medium text-stone-950">{subtotalLabel}</dd>
                  </div>
                ) : null}
                {deliveryFeeLabel && Number(delivery.order.deliveryFee) > 0 ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-stone-500">Teslimat</dt>
                    <dd className="font-medium text-stone-950">{deliveryFeeLabel}</dd>
                  </div>
                ) : null}
                {serviceFeeLabel && Number(delivery.order.serviceFee ?? 0) > 0 ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-stone-500">Hizmet</dt>
                    <dd className="font-medium text-stone-950">{serviceFeeLabel}</dd>
                  </div>
                ) : null}
                {loyaltyDiscountLabel && Number(delivery.order.loyaltyDiscount) > 0 ? (
                  <div className="flex justify-between gap-4 text-green-800">
                    <dt>Sadakat indirimi</dt>
                    <dd className="font-medium">-{loyaltyDiscountLabel}</dd>
                  </div>
                ) : null}
                {(delivery.order.loyaltyPointsUsed ?? 0) > 0 ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-stone-500">Kullanılan puan</dt>
                    <dd className="font-medium text-stone-950">{delivery.order.loyaltyPointsUsed}</dd>
                  </div>
                ) : null}
                {grandTotalLabel ? (
                  <div className="flex justify-between gap-4 border-t border-stone-100 pt-3 text-base font-semibold text-stone-950">
                    <dt>Genel toplam</dt>
                    <dd>{grandTotalLabel}</dd>
                  </div>
                ) : null}
              </dl>
              <p className="mt-3 text-xs leading-5 text-stone-500">Kart bilgisi gösterilmez.</p>
            </DetailSection>
          )}

          <DetailSection title="Zamanlar">
            <dl className="space-y-3 text-sm">
              {orderCreated ? (
                <div>
                  <dt className="text-stone-500">Sipariş oluşturuldu</dt>
                  <dd className="mt-1 font-medium text-stone-950">{orderCreated}</dd>
                </div>
              ) : null}
              {pickedUp ? (
                <div>
                  <dt className="text-stone-500">Teslim alındı</dt>
                  <dd className="mt-1 font-medium text-stone-950">{pickedUp}</dd>
                </div>
              ) : null}
              {delivered ? (
                <div>
                  <dt className="text-stone-500">Teslim edildi</dt>
                  <dd className="mt-1 font-medium text-stone-950">{delivered}</dd>
                </div>
              ) : null}
              {orderUpdated ? (
                <div>
                  <dt className="text-stone-500">Sipariş güncellendi</dt>
                  <dd className="mt-1 font-medium text-stone-950">{orderUpdated}</dd>
                </div>
              ) : null}
              {deliveryUpdated ? (
                <div>
                  <dt className="text-stone-500">Teslimat güncellendi</dt>
                  <dd className="mt-1 font-medium text-stone-950">{deliveryUpdated}</dd>
                </div>
              ) : null}
            </dl>
          </DetailSection>

          {history.length > 0 ? (
            <DetailSection title="Zaman çizelgesi">
              <ol className="max-h-72 space-y-3 overflow-y-auto text-sm">
                {history.map((row) => (
                  <li className="border-l-2 border-stone-200 pl-3" key={row.id}>
                    <p className="font-semibold text-stone-950">{orderStatusLabel(row.status)}</p>
                    <p className="mt-1 text-xs text-stone-500">{formatDateTimeTurkish(row.createdAt) ?? row.createdAt}</p>
                    {row.note ? <p className="mt-1 text-stone-600">{row.note}</p> : null}
                  </li>
                ))}
              </ol>
            </DetailSection>
          ) : null}
        </aside>
      </div>

      {error ? <ErrorState message={error} /> : null}
    </section>
  );
}
