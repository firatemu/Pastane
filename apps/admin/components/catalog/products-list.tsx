'use client';

import type { JSX, MouseEvent } from 'react';
import { useCallback, useEffect, useState } from 'react';
import type { Product } from '../../lib/catalog/types';
import { formatTry } from '../../lib/format/format-try';
import { ProductSaleBadge, ProductStatusPill } from './product-status-pill';

function productThumb(product: Product): Product['images'][0] | undefined {
  return product.images.find((i) => i.isPrimary) ?? product.images[0];
}

/* ─────────────────────── Image Lightbox ─────────────────────── */

function ImageLightbox({
  src,
  alt,
  onClose,
}: Readonly<{ src: string; alt: string; onClose: () => void }>): JSX.Element {
  useEffect(() => {
    function handleKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="absolute -right-3 -top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white text-on-surface shadow-lg transition hover:bg-surface-container"
          onClick={onClose}
          aria-label="Kapat"
        >
          <span className="material-symbols-outlined text-[22px]">close</span>
        </button>
        <img src={src} alt={alt} className="max-h-[85vh] rounded-xl object-contain shadow-2xl" />
        <p className="mt-3 text-center text-sm font-medium text-white/80">{alt}</p>
      </div>
    </div>
  );
}

/* ─────────────────────── Products List ─────────────────────── */

export function ProductsList({
  products,
  selectedId,
  onSelect,
  onEdit,
  canEdit,
}: Readonly<{
  products: Product[];
  selectedId: string | null;
  onSelect: (product: Product) => void;
  onEdit: (product: Product) => void;
  canEdit: boolean;
}>): JSX.Element {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [lightboxAlt, setLightboxAlt] = useState('');

  const openLightbox = useCallback((src: string, alt: string) => {
    setLightboxSrc(src);
    setLightboxAlt(alt);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxSrc(null);
    setLightboxAlt('');
  }, []);
  if (products.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-outline-variant bg-surface-container-low px-8 py-16 text-center">
        <span className="material-symbols-outlined text-[48px] text-outline">search_off</span>
        <p className="mt-4 font-display text-lg font-semibold text-on-surface">Ürün bulunamadı</p>
        <p className="mt-2 text-sm text-on-surface-variant">Arama veya filtreleri değiştirin ya da yeni ürün ekleyin.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-card border border-outline-variant/35 bg-surface-container-lowest shadow-bakery">
      <div className="-mx-gutter overflow-x-auto px-gutter">
        <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr className="border-b border-outline-variant/35">
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Ürün</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Kategori</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Fiyat</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Durum</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-on-surface-variant">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/15 text-[15px]">
            {products.map((product) => {
              const selected = selectedId === product.id;
              const thumb = productThumb(product);
              const hasDiscount = product.discountedPrice != null && Number(product.discountedPrice) > 0;

              return (
                <tr
                  key={product.id}
                  className={`group cursor-pointer transition ${selected ? 'bg-secondary-container/25' : 'hover:bg-surface-variant/35'}`}
                  onClick={() => onSelect(product)}
                >
                  <td className="py-4 pr-4">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className="group/thumb relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-container text-secondary transition hover:ring-2 hover:ring-primary"
                        onClick={(e: MouseEvent) => {
                          e.stopPropagation();
                          if (thumb) openLightbox(thumb.url, product.name);
                        }}
                        disabled={!thumb}
                        aria-label={thumb ? `${product.name} görselini göster` : undefined}
                      >
                        {thumb ? (
                          <img src={thumb.url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="material-symbols-outlined text-[24px]">bakery_dining</span>
                        )}
                        {thumb ? (
                          <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/0 transition group-hover/thumb:bg-black/30">
                            <span className="material-symbols-outlined text-[20px] text-white opacity-0 transition group-hover/thumb:opacity-100">zoom_in</span>
                          </span>
                        ) : null}
                      </button>
                      <div>
                        <p className="font-semibold text-on-surface">{product.displayName ?? product.name}</p>
                        {product.shortDescription ? (
                          <p className="mt-0.5 line-clamp-1 text-sm text-on-surface-variant">{product.shortDescription}</p>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 pr-4 text-on-surface-variant">{product.category.name}</td>
                  <td className="py-4 pr-4">
                    {hasDiscount ? (
                      <div>
                        <span className="font-medium text-secondary">{formatTry(product.discountedPrice!)}</span>
                        <span className="ml-2 text-sm text-on-surface-variant line-through">{formatTry(product.price)}</span>
                      </div>
                    ) : (
                      <span className="font-medium text-on-surface">{formatTry(product.price)}</span>
                    )}
                  </td>
                  <td className="py-4 pr-4">
                    <div className="flex flex-wrap gap-2">
                      <ProductStatusPill status={product.status} />
                      <ProductSaleBadge product={product} />
                    </div>
                  </td>
                  <td className="py-4 text-center">
                    {canEdit ? (
                      <button
                        type="button"
                        className="inline-flex rounded-full p-1.5 text-on-surface-variant transition hover:bg-surface-container hover:text-secondary"
                        onClick={(e: MouseEvent) => {
                          e.stopPropagation();
                          onEdit(product);
                        }}
                        aria-label={`${product.name} düzenle`}
                      >
                        <span className="material-symbols-outlined text-[22px]">edit</span>
                      </button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* Lightbox */}
      {lightboxSrc ? (
        <ImageLightbox src={lightboxSrc} alt={lightboxAlt} onClose={closeLightbox} />
      ) : null}
    </div>
  );
}
