'use client';
import { useState } from 'react';
import type { CartItem } from '../../lib/cart/types';
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
    } catch (e) {
      setError(customerFacingMessageFromUnknownError(e, 'Sepet satırı güncellenemedi.'));
    } finally { setBusy(false); }
  }
  return <article className="rounded-[1.5rem] border border-amber-200/70 bg-white p-4 shadow-sm">
    <div className="flex items-start justify-between gap-4"><div><h3 className="font-semibold">{item.product.name}</h3><p className="mt-1 text-sm text-stone-500">{item.options.length ? item.options.map(({ option }) => `${option.name}${Number(option.priceModifier) ? ` (+${formatTry(option.priceModifier)})` : ''}`).join(', ') : 'Standart'}</p>{item.customNote ? <p className="mt-1 text-sm text-stone-500">Not: {item.customNote}</p> : null}</div><button className="text-sm text-red-700" disabled={busy} onClick={() => void mutate('DELETE')} type="button">Sil</button></div>
    <div className="mt-4 flex items-center justify-between gap-4"><div className="flex items-center gap-2"><button className="h-10 w-10 rounded-full border" disabled={busy || item.quantity <= 1} onClick={() => void mutate('PATCH', item.quantity - 1)} type="button">−</button><span>{item.quantity}</span><button className="h-10 w-10 rounded-full border" disabled={busy} onClick={() => void mutate('PATCH', item.quantity + 1)} type="button">+</button></div><div className="text-right"><p className="font-semibold">{formatTry(lineTotal(item))}</p><p className="text-xs text-stone-500">Birim: {formatTry(item.unitPrice)}</p></div></div>
    {error ? <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
  </article>;
}