'use client';
import { useEffect, useRef, useState } from 'react';
import { ACTIVE_ORDER_STATUSES, paymentStatusLabel } from '../../lib/orders/status';
import type { Order } from '../../lib/orders/types';
import { fetchOrders } from '../../lib/orders/queries';
import { customerFacingMessageFromUnknownError } from '../../lib/messages/customer-facing-errors';
import { formatTry } from '../shared/price';
import { OrderStatusBadge } from './order-status-badge';

export function OrderHistoryClient(): React.JSX.Element {
  const [orders, setOrders] = useState<Order[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const ordersRef = useRef<Order[]>([]);
  async function load(): Promise<void> { try { setError(null); setOrders(await fetchOrders()); } catch (e) { setError(customerFacingMessageFromUnknownError(e, 'Siparişler alınamadı.')); } finally { setLoading(false); } }
  useEffect(() => { ordersRef.current = orders; }, [orders]);
  useEffect(() => { void load(); const timer = setInterval(() => { if (ordersRef.current.some(o => ACTIVE_ORDER_STATUSES.has(o.status))) void load(); }, 25000); return () => clearInterval(timer); }, []);
  const sortedOrders = [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  if (loading) return <p className="rounded-2xl bg-white p-4">Siparişler yükleniyor…</p>;
  if (error) return <p className="rounded-2xl bg-red-50 p-4 text-red-700">{error}</p>;
  if (!sortedOrders.length) return <div className="rounded-[2rem] border border-dashed border-amber-300 bg-white p-8 text-center"><h1 className="text-2xl font-semibold">Henüz siparişiniz yok</h1><p className="mt-2 text-stone-600">Taze ürünlerden seçerek ilk siparişinizi oluşturabilirsiniz.</p><a className="mt-5 inline-block rounded-full bg-stone-900 px-5 py-3 text-white" href="/">Ürünlere dön</a></div>;
  return <div className="space-y-4">{sortedOrders.map(order => <a className="block rounded-[1.5rem] border border-amber-200/70 bg-white p-5 shadow-sm transition hover:border-amber-400" href={`/siparisler/${order.id}`} key={order.id}><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-stone-500">{new Date(order.createdAt).toLocaleString('tr-TR')}</p><h2 className="mt-1 font-semibold">{order.orderNumber}</h2></div><OrderStatusBadge status={order.status} /></div><div className="mt-4 grid gap-2 text-sm text-stone-600 sm:grid-cols-3"><span>{order.items.length} ürün</span><span>{paymentStatusLabel(order.payments?.[0]?.status)}</span><span className="font-semibold text-stone-950">{formatTry(order.grandTotal)}</span></div></a>)}</div>;
}
