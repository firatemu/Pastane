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
  const needsOptions = product.optionGroups.some((group) => group.isRequired && group.options.some((option) => option.isActive));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  async function addToCart(): Promise<void> {
    if (needsOptions) {
      router.push(`/urun/${product.slug}`);
      return;
    }
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
    <article className={`group flex h-full flex-col overflow-hidden rounded-3xl border border-amber-100 bg-surface-lowest shadow-soft transition hover:-translate-y-1 hover:border-honey hover:shadow-ambient ${soldOut ? 'opacity-80' : ''}`}>
      <a className="block" href={`/urun/${product.slug}`}>
        <div className="relative aspect-[4/3] overflow-hidden bg-surface-low">
          {soldOut ? <span className="absolute left-4 top-4 z-10 rounded-full bg-primary/90 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-white">Tükendi</span> : null}
          {!soldOut && product.discountedPrice ? <span className="absolute left-4 top-4 z-10 rounded-full bg-honey px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-primary">İndirimli</span> : null}
          {product.preparationMinutes ? <span className="absolute bottom-4 left-4 z-10 rounded-full bg-white/92 px-3 py-1 text-xs font-extrabold text-primary shadow-soft">{product.preparationMinutes} dk</span> : null}
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
          {product.shortDescription ? <p className="mt-2 line-clamp-2 text-sm leading-5 text-muted">{product.shortDescription}</p> : null}
        </a>
        <div className="flex items-end justify-between gap-3 pt-1">
          <Price value={product.discountedPrice ?? product.price} previous={product.discountedPrice ? product.price : null} size="compact" tone="danger" />
          <button
            aria-label={`${productLabel(product)} ürününü sepete ekle`}
            className="flex min-h-11 shrink-0 items-center justify-center rounded-full bg-primary px-4 text-sm font-extrabold text-white transition hover:bg-primary-container disabled:cursor-not-allowed disabled:bg-muted"
            disabled={busy || soldOut}
            onClick={() => void addToCart()}
            type="button"
          >
            {busy ? 'Ekleniyor' : needsOptions ? 'Seçenek seç' : 'Sepete ekle'}
          </button>
        </div>
        {message ? <p className={`text-xs ${message === 'Sepete eklendi.' ? 'text-primary' : 'text-error'}`}>{message}</p> : null}
      </div>
    </article>
  );
}
