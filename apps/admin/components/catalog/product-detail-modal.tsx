'use client';

import { useEffect, type JSX } from 'react';
import type { Product } from '../../lib/catalog/types';
import { ProductDetailTabs } from './product-detail-tabs';

export function ProductDetailModal({
  product,
  permissions,
  onEdit,
  onClose,
  onChanged,
}: Readonly<{
  product: Product | null;
  permissions: string[];
  onEdit: () => void;
  onClose: () => void;
  onChanged: () => Promise<void>;
}>): JSX.Element | null {
  useEffect(() => {
    if (!product) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [product, onClose]);

  if (!product) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Detayı kapat"
        className="fixed inset-0 z-[50] bg-chocolate/30 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        className="fixed inset-0 z-[50] flex items-center justify-center p-4 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-detail-title"
      >
        <div
          className="pointer-events-auto flex w-full max-w-4xl max-h-[min(90vh,880px)] flex-col overflow-hidden rounded-card border border-outline-variant/40 bg-surface-container-lowest shadow-[0_24px_48px_rgba(61,43,31,0.18)]"
          onClick={(e) => e.stopPropagation()}
          role="document"
        >
          <ProductDetailTabs
            key={product.id}
            product={product}
            permissions={permissions}
            onEdit={onEdit}
            onClose={onClose}
            onChanged={onChanged}
            readOnly
          />
        </div>
      </div>
    </>
  );
}
