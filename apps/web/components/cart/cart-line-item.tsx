'use client';
import { useState } from 'react';
import type { CartItem } from '../../lib/cart/types';
import { productLabel } from '../../lib/catalog/product-label';
import { stitchImages } from '../../lib/stitch-design';
import { messageFromCustomerApiPayload, customerFacingMessageFromUnknownError, type ParsedCustomerApiPayload } from '../../lib/messages/customer-facing-errors';
import { formatTry, Price } from '../shared/price';

function primaryCartLineImage(item: CartItem): { src: string; alt: string } {
  const images = item.product.images ?? [];
  const image = images.find((i) => i.isPrimary) ?? images[0];
  const src = image?.url ?? stitchImages.tart;
  const alt = image?.altText ?? productLabel(item.product);
  return { src, alt };
}

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
  const optionLines = item.options ?? [];
  const { src: imgSrc, alt: imgAlt } = primaryCartLineImage(item);
  return <article className="stitch-panel grid gap-3 rounded-3xl p-3 font-body sm:grid-cols-[104px_1fr] sm:gap-4">
    <div className="aspect-square overflow-hidden rounded-2xl bg-surface-low sm:aspect-auto sm:h-24">
      <img alt={imgAlt} className="h-full w-full object-cover" src={imgSrc} />
    </div>
    <div>
      <div className="flex items-start justify-between gap-4"><div><h3 className="text-lg font-bold leading-snug text-primary">{productLabel(item.product)}</h3><p className="mt-1 text-sm text-muted">{optionLines.length ? optionLines.map(({ option }) => `${option.name}${Number(option.priceModifier) ? ` (+${formatTry(option.priceModifier)})` : ''}`).join(', ') : 'Standart'}</p>{item.customNote ? <p className="mt-1 text-sm text-muted">Not: {item.customNote}</p> : null}</div><button className="text-sm font-semibold text-error" disabled={busy} onClick={() => void mutate('DELETE')} type="button">Sil</button></div>
    <div className="mt-4 flex items-center justify-between gap-4"><div className="flex items-center rounded-full border border-outline-soft/60 bg-surface-lowest px-1.5 py-0.5"><button className="h-8 w-8 rounded-full text-primary text-sm disabled:text-muted/50" disabled={busy || item.quantity <= 1} onClick={() => void mutate('PATCH', item.quantity - 1)} type="button">-</button><span className="min-w-8 text-center text-sm font-semibold">{item.quantity}</span><button className="h-8 w-8 rounded-full text-primary text-sm" disabled={busy} onClick={() => void mutate('PATCH', item.quantity + 1)} type="button">+</button></div><div className="flex flex-col items-end"><Price value={lineTotal(item)} /><p className="mt-0.5 font-body text-sm text-muted">Birim: {formatTry(item.unitPrice)}</p></div></div>
    </div>
    {error ? <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
  </article>;
}
