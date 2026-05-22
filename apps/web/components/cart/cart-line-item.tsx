'use client';
import { useState } from 'react';
import type { CartItem } from '../../lib/cart/types';
import { stitchImages } from '../../lib/stitch-design';
import { messageFromCustomerApiPayload, customerFacingMessageFromUnknownError, type ParsedCustomerApiPayload } from '../../lib/messages/customer-facing-errors';
import { formatTry } from '../shared/price';

function lineTotal(item: CartItem): string {
  return (Number(item.unitPrice) * item.quantity).toFixed(2);
}

export function CartLineItem({ item, onChanged }: Readonly<{ item: CartItem; onChanged: () => Promise<void> }>): React.JSX.Element {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function mutate(method: 'PATCH' | 'DELETE', quantity?: number) {
    setBusy(true); setError(null);
    try {
      const init: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };
      if (method === 'PATCH') init.body = JSON.stringify({ quantity });
      const response = await fetch(`/api/cart/items/${item.id}`, init);
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as ParsedCustomerApiPayload;
        throw new Error(messageFromCustomerApiPayload(response.status, payload, 'Sepet satırı güncellenemedi.'));
      }
      await onChanged();
      window.dispatchEvent(new Event('cart:changed'));
    } catch (e) {
      setError(customerFacingMessageFromUnknownError(e, 'Sepet satırı güncellenemedi.'));
    } finally { setBusy(false); }
  }
  return <article className="stitch-panel grid gap-5 rounded-3xl p-4 sm:grid-cols-[140px_1fr]">
    <div className="aspect-square overflow-hidden rounded-2xl bg-surface-low">
      <img alt={item.product.name} className="h-full w-full object-cover" src={stitchImages.cartCake} />
    </div>
    <div>
      <div className="flex items-start justify-between gap-4"><div><h3 className="font-display text-2xl font-semibold text-primary">{item.product.name}</h3><p className="mt-2 text-sm text-muted">{item.options.length ? item.options.map(({ option }) => `${option.name}${Number(option.priceModifier) ? ` (+${formatTry(option.priceModifier)})` : ''}`).join(', ') : 'Standart'}</p>{item.customNote ? <p className="mt-1 text-sm text-muted">Not: {item.customNote}</p> : null}</div><button className="text-sm font-semibold text-error" disabled={busy} onClick={() => void mutate('DELETE')} type="button">Sil</button></div>
    <div className="mt-6 flex items-center justify-between gap-4"><div className="flex items-center rounded-full border border-outline-soft/60 bg-surface-lowest px-2 py-1"><button className="h-9 w-9 rounded-full text-primary disabled:text-muted/50" disabled={busy || item.quantity <= 1} onClick={() => void mutate('PATCH', item.quantity - 1)} type="button">-</button><span className="min-w-8 text-center font-semibold">{item.quantity}</span><button className="h-9 w-9 rounded-full text-primary" disabled={busy} onClick={() => void mutate('PATCH', item.quantity + 1)} type="button">+</button></div><div className="text-right"><p className="font-display text-2xl font-semibold text-primary">{formatTry(lineTotal(item))}</p><p className="text-xs text-muted">Birim: {formatTry(item.unitPrice)}</p></div></div>
    </div>
    {error ? <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
  </article>;
}
