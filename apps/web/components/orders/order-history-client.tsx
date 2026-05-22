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
  if (loading) return <p className="stitch-panel rounded-3xl p-4">Siparişler yükleniyor...</p>;
  if (error) return <p className="rounded-2xl bg-red-50 p-4 text-red-700">{error}</p>;
  if (!sortedOrders.length) return <div className="stitch-panel rounded-3xl p-8 text-center"><h1 className="font-display text-3xl font-semibold text-primary">Henüz siparişiniz yok</h1><p className="mt-2 text-muted">Taze ürünlerden seçerek ilk siparişinizi oluşturabilirsiniz.</p><a className="stitch-button mt-5" href="/">Ürünlere dön</a></div>;
  return <div className="space-y-4">{sortedOrders.map(order => <a className="stitch-panel block rounded-3xl p-5 transition hover:border-primary" href={`/siparisler/${order.id}`} key={order.id}><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-muted">{new Date(order.createdAt).toLocaleString('tr-TR')}</p><h2 className="mt-1 font-display text-2xl font-semibold text-primary">{order.orderNumber}</h2></div><OrderStatusBadge status={order.status} /></div><div className="mt-4 grid gap-2 text-sm text-muted sm:grid-cols-3"><span>{order.items.length} ürün</span><span>{paymentStatusLabel(order.payments?.[0]?.status)}</span><span className="font-semibold text-primary">{formatTry(order.grandTotal)}</span></div></a>)}</div>;
}
