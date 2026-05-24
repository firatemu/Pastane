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
  return <div className="grid gap-6 lg:grid-cols-[1fr_340px]"><section className="space-y-5"><div className="rounded-[2rem] border border-amber-200/70 bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-stone-500">{new Date(order.createdAt).toLocaleString('tr-TR')}</p><h1 className="text-2xl font-semibold">{order.orderNumber}</h1></div><OrderStatusBadge status={order.status} /></div><p className="mt-3 text-sm text-stone-600">{paymentStatusLabel(latestPayment?.status)}</p>{latestPayment?.processingResult ? <p className="mt-1 text-xs text-stone-500">Ödeme sonucu: {latestPayment.processingResult}</p> : null}{CANCELLABLE_STATUSES.has(order.status) ? <button className="mt-4 rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-700 disabled:opacity-60" disabled={busy} onClick={cancel} type="button">{busy ? 'İptal ediliyor…' : 'Siparişi iptal et'}</button> : null}</div>
    <div className="rounded-[2rem] border border-amber-200/70 bg-white p-5"><h2 className="text-lg font-semibold">Teslimat bilgisi</h2><div className="mt-4 rounded-2xl bg-stone-50 p-4">{order.deliveryType === 'HOME_DELIVERY' ? renderAddress(order.addressSnapshot) : order.pickupStore ? <div className="text-sm text-stone-700"><p className="font-medium">Mağazadan teslim · {order.pickupStore.name}</p><p className="mt-1">{order.pickupStore.address}</p><p className="mt-1 text-stone-500">{order.pickupStore.district} / {order.pickupStore.city}</p>{order.pickupStore.phone ? <p className="mt-1 text-amber-800">{order.pickupStore.phone}</p> : null}</div> : <p className="text-sm text-stone-600">Teslimat bilgisi bulunamadı.</p>}</div>{order.delivery ? <div className="mt-3 rounded-2xl border px-4 py-3 text-sm"><p className="font-medium">Kurye durumu: {deliveryStatusLabel(order.delivery.status)}</p>{order.delivery.courier?.user ? <p className="mt-1 text-stone-600">Kurye: {order.delivery.courier.user.firstName} {order.delivery.courier.user.lastName} · {order.delivery.courier.user.phone}</p> : null}{order.delivery.failedReason ? <p className="mt-1 text-red-700">Başarısız teslimat nedeni: {order.delivery.failedReason}</p> : null}</div> : null}</div>
    <div className="rounded-[2rem] border border-amber-200/70 bg-white p-5"><h2 className="text-lg font-semibold">Ürünler</h2><div className="mt-4 space-y-4">{order.items.map(item => <article className="rounded-2xl border border-stone-200 p-4" key={item.id}><div className="flex justify-between gap-3"><div><h3 className="font-medium">{item.productNameSnapshot}</h3><p className="mt-1 text-sm text-stone-500">{item.quantity} adet · {item.options?.map(o => `${o.optionNameSnapshot}${Number(o.priceModifierSnapshot) ? ` (+${formatTry(o.priceModifierSnapshot)})` : ''}`).join(', ') || 'Standart'}</p>{item.customNote ? <p className="mt-1 text-sm text-stone-500">Not: {item.customNote}</p> : null}</div><p className="font-semibold">{formatTry(item.unitPriceSnapshot)}</p></div>{order.status === 'DELIVERED' ? item.review ? <p className="mt-3 rounded-2xl bg-stone-50 px-4 py-3 text-sm text-stone-700">{item.review.status === 'PENDING' ? 'Yorumunuz onay bekliyor.' : item.review.status === 'APPROVED' ? 'Yorumunuz yayınlandı.' : 'Yorumunuz moderasyon sonucunda reddedildi.'}</p> : <ReviewForm orderItemId={item.id} onSubmitted={async () => { await load(); }} /> : null}</article>)}</div></div></section><aside className="space-y-5"><div className="rounded-[2rem] bg-stone-900 p-5 text-white"><h2 className="text-lg font-semibold">Takip</h2><div className="mt-4 rounded-2xl bg-white p-4 text-stone-900"><OrderTimeline status={order.status} history={order.statusHistory} /></div></div><div className="rounded-[2rem] border border-amber-200/70 bg-white p-5"><h2 className="text-lg font-semibold">Tutar</h2><dl className="mt-4 space-y-2 text-sm"><div className="flex justify-between"><dt>Ara toplam</dt><dd>{formatTry(order.subtotal)}</dd></div><div className="flex justify-between"><dt>Teslimat</dt><dd>{formatTry(order.deliveryFee)}</dd></div>{order.serviceFee ? <div className="flex justify-between"><dt>Servis</dt><dd>{formatTry(order.serviceFee)}</dd></div> : null}{order.loyaltyDiscount && Number(order.loyaltyDiscount) > 0 ? <div className="flex justify-between text-emerald-700"><dt>Puan indirimi{order.loyaltyPointsUsed ? ` (${order.loyaltyPointsUsed} puan)` : ''}</dt><dd>-{formatTry(order.loyaltyDiscount)}</dd></div> : null}<div className="flex justify-between border-t pt-2 font-semibold"><dt>Genel toplam</dt><dd>{formatTry(order.grandTotal)}</dd></div></dl></div><div className="rounded-[2rem] border border-amber-200/70 bg-white p-5"><h2 className="text-lg font-semibold">Ödeme kayıtları</h2><div className="mt-4 space-y-2">{order.payments?.length ? order.payments.map(payment => <div className="rounded-2xl bg-stone-50 px-4 py-3 text-sm" key={payment.id}><div className="flex justify-between gap-3"><span>{paymentStatusLabel(payment.status)}</span>{payment.amount ? <span className="font-medium">{formatTry(payment.amount)}</span> : null}</div>{payment.createdAt ? <p className="mt-1 text-xs text-stone-500">{new Date(payment.createdAt).toLocaleString('tr-TR')}</p> : null}{payment.failureReason ? <p className="mt-1 text-xs text-red-700">{payment.failureReason}</p> : null}</div>) : <p className="text-sm text-stone-600">Ödeme kaydı yok.</p>}</div></div></aside></div>;
}