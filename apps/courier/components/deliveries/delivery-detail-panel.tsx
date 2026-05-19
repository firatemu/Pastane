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

  const history = [...delivery.order.statusHistory].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-2">
        <p className="text-xs text-stone-500">Teslimat detayı</p>
        <PollingNote seconds={15} lastRefreshedAt={lastRefreshedAt} pollWarning={pollWarning} />
      </div>

      <article className="space-y-4 rounded-3xl border bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.18em] text-stone-500">{delivery.order.orderNumber}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-semibold text-violet-900">
                {deliveryTypeLabel(delivery.order.deliveryType)}
              </span>
              {payStatus ? (
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${paymentStatusBadgeClass(payStatus)}`}>
                  Ödeme: {paymentStatusLabel(payStatus)}
                </span>
              ) : null}
            </div>
            <h1 className="mt-2 text-2xl font-semibold">
              {delivery.order.user.firstName} {delivery.order.user.lastName}
            </h1>
            <p className="mt-2 text-sm text-stone-600">
              Sipariş: <span className="font-medium">{orderStatusLabel(delivery.order.status)}</span>
            </p>
            {scheduled ? <p className="mt-1 text-sm text-stone-600">Planlanan: {scheduled}</p> : null}
          </div>
          <DeliveryStatusBadge status={delivery.status} />
        </div>

        <div className="rounded-2xl bg-stone-100 p-4 text-sm text-stone-700">
          <p className="text-xs uppercase tracking-[0.18em] text-stone-500">Zamanlar</p>
          <ul className="mt-2 space-y-1">
            {orderCreated ? <li>Sipariş oluşturulma: {orderCreated}</li> : null}
            {pickedUp ? <li>Teslim alındı: {pickedUp}</li> : null}
            {delivered ? <li>Teslim edildi: {delivered}</li> : null}
            {duration ? <li>Yolda geçen süre: {duration}</li> : null}
            {orderUpdated ? <li>Sipariş son güncelleme: {orderUpdated}</li> : null}
            {deliveryUpdated ? <li>Teslimat kaydı güncellendi: {deliveryUpdated}</li> : null}
          </ul>
        </div>

        {(formatTryAmount(delivery.order.subtotal) ||
          formatTryAmount(delivery.order.grandTotal) ||
          (delivery.order.loyaltyPointsUsed ?? 0) > 0) && (
          <div className="rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-800">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Tutar özeti</p>
            <ul className="mt-2 space-y-1">
              {formatTryAmount(delivery.order.subtotal) ? <li>Ara toplam: {formatTryAmount(delivery.order.subtotal)}</li> : null}
              {formatTryAmount(delivery.order.deliveryFee) && Number(delivery.order.deliveryFee) > 0 ? (
                <li>Teslimat: {formatTryAmount(delivery.order.deliveryFee)}</li>
              ) : null}
              {formatTryAmount(delivery.order.serviceFee) && Number(delivery.order.serviceFee ?? 0) > 0 ? (
                <li>Hizmet: {formatTryAmount(delivery.order.serviceFee)}</li>
              ) : null}
              {formatTryAmount(delivery.order.loyaltyDiscount) && Number(delivery.order.loyaltyDiscount) > 0 ? (
                <li>Sadakat indirimi: −{formatTryAmount(delivery.order.loyaltyDiscount)}</li>
              ) : null}
              {(delivery.order.loyaltyPointsUsed ?? 0) > 0 ? (
                <li>Kullanılan puan: {delivery.order.loyaltyPointsUsed}</li>
              ) : null}
              {formatTryAmount(delivery.order.grandTotal) ? (
                <li className="border-t border-stone-100 pt-1 font-semibold">Genel toplam: {formatTryAmount(delivery.order.grandTotal)}</li>
              ) : null}
            </ul>
            <p className="mt-2 text-xs text-stone-500">Tutarlar sipariş anındaki kayıtlardır; kart bilgisi gösterilmez.</p>
          </div>
        )}

        {delivery.status === 'FAILED' && delivery.failedReason ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
            <p className="text-xs font-semibold uppercase tracking-[0.18em]">Başarısızlık nedeni</p>
            <p className="mt-2 leading-6">{delivery.failedReason}</p>
          </div>
        ) : null}

        <div className="rounded-2xl bg-stone-50 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-stone-500">Adres</p>
          <p className="mt-2 text-sm leading-6">{formatAddressSnapshot(delivery.order.addressSnapshot)}</p>
          {delivery.order.deliveryType === 'HOME_DELIVERY' && navCoords ? (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <a
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-2xl border border-stone-200 bg-white px-4 py-2 text-center text-sm font-semibold text-stone-900 shadow-sm underline-offset-2 hover:underline"
                href={`https://www.google.com/maps/dir/?api=1&destination=${navCoords.lat},${navCoords.lng}`}
                rel="noopener noreferrer"
                target="_blank"
              >
                Google Maps ile Yol Tarifi Al
              </a>
              <a
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-2xl border border-stone-200 bg-white px-4 py-2 text-center text-sm font-semibold text-stone-900 shadow-sm underline-offset-2 hover:underline"
                href={`https://yandex.com/maps/?rtext=~${navCoords.lat},${navCoords.lng}&rtt=auto`}
                rel="noopener noreferrer"
                target="_blank"
              >
                Yandex Navi ile Aç
              </a>
            </div>
          ) : delivery.order.deliveryType === 'HOME_DELIVERY' ? (
            <p className="mt-3 text-xs text-amber-800">Bu sipariş için harita konumu bulunmuyor.</p>
          ) : null}
          <a className="mt-3 inline-flex min-h-11 items-center text-base font-semibold text-green-800 underline-offset-2 hover:underline" href={`tel:${phoneClean}`}>
            Ara: {delivery.order.user.phone}
          </a>
        </div>

        {delivery.order.note ? (
          <div className="rounded-2xl bg-amber-50 p-4 text-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">Sipariş notu</p>
            <p className="mt-2">{delivery.order.note}</p>
          </div>
        ) : null}

        <div className="space-y-2">
          <h2 className="font-semibold">Ürünler</h2>
          {delivery.order.items.map((item) => {
            const line = orderLineTotalTry(item);
            const lineLabel = formatTryAmount(String(line));
            const unitLabel = formatTryAmount(item.unitPriceSnapshot);
            return (
              <div className="rounded-2xl border p-3 text-sm" key={item.id}>
                <div className="font-medium">
                  {item.productNameSnapshot} × {item.quantity}
                </div>
                {unitLabel ? <p className="mt-1 text-stone-600">Birim (sipariş anı): {unitLabel}</p> : null}
                {lineLabel ? <p className="mt-0.5 text-stone-800">Satır tahmini: {lineLabel}</p> : null}
                {item.customNote ? (
                  <p className="mt-1 text-stone-600">Müşteri notu (satır): {item.customNote}</p>
                ) : null}
                <div className="mt-1 text-stone-600">
                  {item.options.length === 0 ? (
                    'Opsiyon yok'
                  ) : (
                    <ul className="list-inside list-disc space-y-0.5">
                      {item.options.map((option) => (
                        <li key={orderItemOptionKey(option)}>
                          {option.optionNameSnapshot}
                          {formatTryAmount(option.priceModifierSnapshot)
                            ? ` (+${formatTryAmount(option.priceModifierSnapshot)})`
                            : ''}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {history.length > 0 ? (
          <div className="space-y-2">
            <h2 className="font-semibold">Sipariş zaman çizelgesi</h2>
            <ul className="max-h-48 space-y-2 overflow-y-auto text-sm text-stone-700">
              {history.map((row) => (
                <li className="rounded-xl border border-stone-100 bg-white px-3 py-2" key={row.id}>
                  <span className="font-medium">{orderStatusLabel(row.status)}</span>
                  <span className="text-stone-500">
                    {' '}
                    · {formatDateTimeTurkish(row.createdAt) ?? row.createdAt}
                  </span>
                  {row.note ? <p className="mt-1 text-stone-600">{row.note}</p> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </article>

      {error ? <ErrorState message={error} /> : null}
      <DeliveryActions delivery={delivery} onChanged={load} onError={setError} />
    </section>
  );
}
