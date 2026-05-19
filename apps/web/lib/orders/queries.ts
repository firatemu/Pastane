import type { Order } from './types';
import { messageFromCustomerApiPayload, type ParsedCustomerApiPayload } from '../messages/customer-facing-errors';

async function parse<T>(response: Response, fallback: string): Promise<T> {
  const payload = (await response.json()) as ParsedCustomerApiPayload & { data?: T };
  if (!response.ok || !payload.data) throw new Error(messageFromCustomerApiPayload(response.status, payload, fallback));
  return payload.data;
}

export async function fetchOrders(): Promise<Order[]> { return parse<Order[]>(await fetch('/api/orders/my', { cache: 'no-store' }), 'Siparişler alınamadı.'); }
export async function fetchOrder(id: string): Promise<Order> { return parse<Order>(await fetch(`/api/orders/${id}`, { cache: 'no-store' }), 'Sipariş detayı alınamadı.'); }
export async function cancelOrder(id: string): Promise<Order> { return parse<Order>(await fetch(`/api/orders/${id}/cancel`, { method: 'POST' }), 'Sipariş iptal edilemedi.'); }
