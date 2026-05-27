'use client';
import { useAdaptivePolling } from '@pastane/ui';
import type { AdaptivePollOutcome } from '@pastane/ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ACTIVE_ORDER_STATUSES, CANCELLABLE_STATUSES, deliveryStatusLabel, paymentStatusLabel } from '../../lib/orders/status';
import type { AddressSnapshot, Order } from '../../lib/orders/types';
import { cancelOrder, fetchOrder } from '../../lib/orders/queries';
import { customerFacingMessageFromUnknownError } from '../../lib/messages/customer-facing-errors';
import { formatTry } from '../shared/price';
import { OrderStatusBadge } from './order-status-badge';
import { OrderTimeline } from './order-timeline';
import { ReviewForm } from './review-form';

function renderAddress(address?: AddressSnapshot | null): React.JSX.Element | null {
  if (!address) return null;
  return <div className="text-sm text-stone-700"><p className="font-medium">{address.title ?? 'Teslimat adresi'}</p><p className="mt-1">{address.fullAddress}</p><p className="mt-1 text-stone-500">{address.neighborhood ? `${address.neighborhood} · ` : ''}{address.district} / {address.city}</p>{address.building || address.floor || address.apartment ? <p className="mt-1 text-stone-500">Bina {address.building ?? '-'} · Kat {address.floor ?? '-'} · Daire {address.apartment ?? '-'}</p> : null}{address.directions ? <p className="mt-1 text-stone-500">Tarif: {address.directions}</p> : null}</div>;
}

export function OrderDetailClient({ id }: Readonly<{ id: string }>): React.JSX.Element {
  const [order, setOrder] = useState<Order | null>(null); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const orderRef = useRef<Order | null>(null);
  const load = useCallback(async (): Promise<AdaptivePollOutcome> => {
    try {
      setError(null);
      setOrder(await fetchOrder(id));
      return 'ok';
    } catch (e) {
      setError(customerFacingMessageFromUnknownError(e, 'Sipariş alınamadı.'));
      return 'error';
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    orderRef.current = order;
  }, [order]);

  useEffect(() => {
    void load();
  }, [load]);

  const pollTick = useCallback(async (): Promise<AdaptivePollOutcome> => {
    if (!(orderRef.current && ACTIVE_ORDER_STATUSES.has(orderRef.current.status))) {
      return 'ok';
    }
    return load();
  }, [load]);

  useAdaptivePolling({ poll: pollTick, immediate: false, baseIntervalMs: 25_000 });
  async function cancel(): Promise<void> { if (!order) return; setBusy(true); try { await cancelOrder(order.id); await load(); } catch (e) { setError(customerFacingMessageFromUnknownError(e, 'Sipariş iptal edilemedi.')); } finally { setBusy(false); } }
  if (loading) return <p className="rounded-2xl bg-white p-4">Sipariş yükleniyor…</p>;
  if (error) return <p className="rounded-2xl bg-red-50 p-4 text-red-700">{error}</p>;
  if (!order) return <p className="rounded-2xl bg-white p-4">Sipariş bulunamadı.</p>;
  const latestPayment = order.payments?.[0];
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="space-y-5">
        <div className="stitch-panel rounded-3xl p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-muted">{new Date(order.createdAt).toLocaleString('tr-TR')}</p>
              <h1 className="mt-1 font-display text-4xl font-bold text-primary">{order.orderNumber}</h1>
              <p className="mt-3 text-sm font-semibold text-muted">Ödeme: {paymentStatusLabel(latestPayment?.status)}</p>
              {latestPayment?.processingResult ? <p className="mt-1 text-xs text-muted">Ödeme sonucu: {latestPayment.processingResult}</p> : null}
            </div>
            <OrderStatusBadge status={order.status} />
          </div>
          {CANCELLABLE_STATUSES.has(order.status) ? <button className="mt-5 rounded-full border border-red-200 px-5 py-3 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-60" disabled={busy} onClick={cancel} type="button">{busy ? 'İptal ediliyor…' : 'Siparişi iptal et'}</button> : null}
        </div>

        <div className="stitch-panel rounded-3xl p-6">
          <h2 className="font-display text-2xl font-bold text-primary">Teslimat bilgisi</h2>
          <div className="mt-4 rounded-2xl bg-surface-low p-4">{order.deliveryType === 'HOME_DELIVERY' ? renderAddress(order.addressSnapshot) : order.pickupStore ? <div className="text-sm text-muted"><p className="font-semibold text-primary">Mağazadan teslim · {order.pickupStore.name}</p><p className="mt-1">{order.pickupStore.address}</p><p className="mt-1">{order.pickupStore.district} / {order.pickupStore.city}</p>{order.pickupStore.phone ? <p className="mt-1 text-secondary">{order.pickupStore.phone}</p> : null}</div> : <p className="text-sm text-muted">Teslimat bilgisi bulunamadı.</p>}</div>
          {order.delivery ? <div className="mt-3 rounded-2xl border border-outline-soft/50 px-4 py-3 text-sm"><p className="font-semibold text-primary">Kurye durumu: {deliveryStatusLabel(order.delivery.status)}</p>{order.delivery.courier?.user ? <p className="mt-1 text-muted">Kurye: {order.delivery.courier.user.firstName} {order.delivery.courier.user.lastName} · {order.delivery.courier.user.phone}</p> : null}{order.delivery.failedReason ? <p className="mt-1 text-red-700">Başarısız teslimat nedeni: {order.delivery.failedReason}</p> : null}</div> : null}
        </div>

        <div className="stitch-panel rounded-3xl p-6">
          <h2 className="font-display text-2xl font-bold text-primary">Ürünler</h2>
          <div className="mt-4 space-y-4">{order.items.map(item => <article className="rounded-2xl border border-outline-soft/50 bg-white p-4" key={item.id}><div className="flex justify-between gap-4"><div><h3 className="font-bold text-primary">{item.productNameSnapshot}</h3><p className="mt-1 text-sm text-muted">{item.quantity} adet · {item.options?.map(o => `${o.optionNameSnapshot}${Number(o.priceModifierSnapshot) ? ` (+${formatTry(o.priceModifierSnapshot)})` : ''}`).join(', ') || 'Standart'}</p>{item.customNote ? <p className="mt-2 rounded-2xl bg-surface-low px-3 py-2 text-sm text-muted">Not: {item.customNote}</p> : null}</div><p className="shrink-0 font-extrabold text-primary">{formatTry(item.unitPriceSnapshot)}</p></div>{order.status === 'DELIVERED' ? item.review ? <p className="mt-3 rounded-2xl bg-surface-low px-4 py-3 text-sm text-muted">{item.review.status === 'PENDING' ? 'Yorumunuz onay bekliyor.' : item.review.status === 'APPROVED' ? 'Yorumunuz yayınlandı.' : 'Yorumunuz moderasyon sonucunda reddedildi.'}</p> : <ReviewForm orderItemId={item.id} onSubmitted={async () => { await load(); }} /> : null}</article>)}</div>
        </div>
      </section>

      <aside className="space-y-5 lg:sticky lg:top-28 lg:h-fit">
        <div className="rounded-3xl bg-primary p-5 text-white shadow-ambient"><h2 className="font-display text-2xl font-bold">Sipariş takibi</h2><div className="mt-4 rounded-2xl bg-white p-4 text-primary"><OrderTimeline status={order.status} history={order.statusHistory} /></div></div>
        <div className="stitch-panel rounded-3xl p-5"><h2 className="font-display text-2xl font-bold text-primary">Tutar</h2><dl className="mt-4 space-y-3 text-sm"><div className="flex justify-between"><dt>Ara toplam</dt><dd>{formatTry(order.subtotal)}</dd></div><div className="flex justify-between"><dt>Teslimat</dt><dd>{formatTry(order.deliveryFee)}</dd></div>{order.serviceFee ? <div className="flex justify-between"><dt>Servis</dt><dd>{formatTry(order.serviceFee)}</dd></div> : null}{order.loyaltyDiscount && Number(order.loyaltyDiscount) > 0 ? <div className="flex justify-between text-emerald-700"><dt>Puan indirimi{order.loyaltyPointsUsed ? ` (${order.loyaltyPointsUsed} puan)` : ''}</dt><dd>-{formatTry(order.loyaltyDiscount)}</dd></div> : null}<div className="flex justify-between border-t border-outline-soft/50 pt-3 text-lg font-extrabold text-primary"><dt>Genel toplam</dt><dd>{formatTry(order.grandTotal)}</dd></div></dl></div>
        <div className="stitch-panel rounded-3xl p-5"><h2 className="font-display text-2xl font-bold text-primary">Ödeme kayıtları</h2><div className="mt-4 space-y-2">{order.payments?.length ? order.payments.map(payment => <div className="rounded-2xl bg-surface-low px-4 py-3 text-sm" key={payment.id}><div className="flex justify-between gap-3"><span>{paymentStatusLabel(payment.status)}</span>{payment.amount ? <span className="font-bold">{formatTry(payment.amount)}</span> : null}</div>{payment.createdAt ? <p className="mt-1 text-xs text-muted">{new Date(payment.createdAt).toLocaleString('tr-TR')}</p> : null}{payment.failureReason ? <p className="mt-1 text-xs text-red-700">{payment.failureReason}</p> : null}</div>) : <p className="text-sm text-muted">Ödeme kaydı yok.</p>}</div></div>
      </aside>
    </div>
  );
}
