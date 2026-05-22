'use client';
import { useEffect, useState } from 'react';
import type { Cart } from '../../lib/cart/types';
import { fetchCart } from '../../lib/cart/queries';
import { customerFacingMessageFromUnknownError } from '../../lib/messages/customer-facing-errors';
import { CartLineItem } from './cart-line-item';
import { CartSummary } from './cart-summary';
import { EmptyCart } from './empty-cart';
export function CartPageClient(): React.JSX.Element {
  const [cart, setCart] = useState<Cart | null>(null); const [error, setError] = useState<string | null>(null);
  async function load() { try { setError(null); setCart(await fetchCart()); } catch (e) { setError(customerFacingMessageFromUnknownError(e, 'Sepet alınamadı.')); } }
  useEffect(() => { void load(); }, []);
  if (error) return <p className="rounded-2xl bg-red-50 p-4 text-red-700">{error}</p>;
  if (!cart) return <p className="stitch-panel rounded-3xl p-4">Sepet yükleniyor...</p>;
  if (!cart.items.length) return <EmptyCart />;
  return <div className="grid gap-8 lg:grid-cols-[1fr_380px]"><section className="space-y-5">{cart.items.map((item) => <CartLineItem item={item} key={item.id} onChanged={load} />)}</section><CartSummary cart={cart} /></div>;
}
