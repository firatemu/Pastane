import type { Cart } from './types';
import { messageFromCustomerApiPayload, type ParsedCustomerApiPayload } from '../messages/customer-facing-errors';

export async function fetchCart(): Promise<Cart> {
  const response = await fetch('/api/cart', { cache: 'no-store' });
  const payload = (await response.json()) as ParsedCustomerApiPayload & { data?: Cart };
  if (!response.ok || !payload.data) throw new Error(messageFromCustomerApiPayload(response.status, payload, 'Sepet alınamadı.'));
  return payload.data;
}
