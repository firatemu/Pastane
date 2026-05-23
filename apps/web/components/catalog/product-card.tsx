'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Product } from '../../lib/catalog/types';
import { productLabel } from '../../lib/catalog/product-label';
import { stitchImages } from '../../lib/stitch-design';
import { messageFromCustomerApiPayload, type ParsedCustomerApiPayload } from '../../lib/messages/customer-facing-errors';
import { Price } from '../shared/price';

export function ProductCard({ product }: Readonly<{ product: Product }>): React.JSX.Element {
  const image = product.images.find((item) => item.isPrimary) ?? product.images[0];
  const soldOut = product.isPurchasable === false;
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  async function addToCart(): Promise<void> {
    setBusy(true);
    setMessage(null);
    const response = await fetch('/api/cart/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: product.id, quantity: 1, optionIds: [] }),
    });
    if (response.status === 401) {
      router.push('/giris?neden=oturum');
      return;
    }
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as ParsedCustomerApiPayload;
      setMessage(messageFromCustomerApiPayload(response.status, payload, 'Ürün sepete eklenemedi.'));
      setBusy(false);
      return;
    }
    setMessage('Sepete eklendi.');
    setBusy(false);
    window.dispatchEvent(new Event('cart:changed'));
    router.refresh();
  }

  return (
    <article className={`group flex h-full flex-col overflow-hidden rounded-3xl border border-outline-soft/50 bg-surface-lowest shadow-soft transition hover:-translate-y-1 hover:shadow-ambient ${soldOut ? 'opacity-80' : ''}`}>
      <a className="block" href={`/urun/${product.slug}`}>
        <div className="relative h-56 overflow-hidden bg-surface-low sm:h-64">
          {soldOut ? <span className="absolute left-4 top-4 z-10 rounded-full bg-primary/90 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-white">Tükendi</span> : null}
          {!soldOut && product.discountedPrice ? <span className="absolute left-4 top-4 z-10 rounded-full bg-honey px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-primary">İndirimli</span> : null}
          <img
            alt={image?.altText ?? product.name}
            className={`h-full w-full object-cover transition duration-700 group-hover:scale-105 ${soldOut ? 'grayscale-[0.35]' : ''}`}
            src={image?.url ?? stitchImages.tart}
          />
        </div>
      </a>
      <div className="mt-auto space-y-2 p-4">
        <a className="block" href={`/urun/${product.slug}`}>
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-secondary">{product.category.name}</p>
          <h2 className="mt-1 font-body text-lg font-bold leading-snug text-primary">{productLabel(product)}</h2>
        </a>
        <div className="flex items-end justify-between gap-3">
          <Price value={product.discountedPrice ?? product.price} previous={product.discountedPrice ? product.price : null} size="compact" tone="danger" />
          <button
            aria-label={`${productLabel(product)} ürününü sepete ekle`}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-semibold leading-none text-white transition hover:bg-primary-container disabled:cursor-not-allowed disabled:bg-muted"
            disabled={busy || soldOut}
            onClick={() => void addToCart()}
            type="button"
          >
            {busy ? '...' : '+'}
          </button>
        </div>
        {message ? <p className={`text-xs ${message === 'Sepete eklendi.' ? 'text-primary' : 'text-error'}`}>{message}</p> : null}
      </div>
    </article>
  );
}
