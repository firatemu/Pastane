import type { JSX } from 'react';
import type { Product } from '../../lib/catalog/types';

export const PRODUCT_STATUS_LABELS: Record<'ACTIVE' | 'INACTIVE', string> = {
  ACTIVE: 'Aktif',
  INACTIVE: 'Pasif',
};

type ProductStatusTone = 'active' | 'inactive';

function toneFor(status: Product['status']): ProductStatusTone {
  return status === 'ACTIVE' ? 'active' : 'inactive';
}

export function ProductStatusPill({ status }: Readonly<{ status: Product['status'] }>): JSX.Element {
  const tone = toneFor(status);
  const label = status === 'OUT_OF_STOCK' ? 'Pasif katalog' : PRODUCT_STATUS_LABELS[status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE'];
  const cls =
    tone === 'active'
      ? 'border border-tertiary/25 bg-tertiary-container text-tertiary'
      : 'border border-outline-variant/50 bg-surface-variant text-on-surface-variant';

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}

export function ProductSaleBadge({ product }: Readonly<{ product: Product }>): JSX.Element {
  if (product.isPurchasable) {
    return (
      <span className="inline-flex items-center rounded-full border border-tertiary/25 bg-tertiary-container px-3 py-1 text-xs font-semibold text-tertiary">
        Şu an satışta
      </span>
    );
  }
  if (!product.isPublished) {
    return (
      <span className="inline-flex items-center rounded-full border border-error/30 bg-error-container px-3 py-1 text-xs font-semibold text-error">
        Yayında değil
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-error/30 bg-error-container px-3 py-1 text-xs font-semibold text-error">
      Tükendi görünümü
    </span>
  );
}

function formatSaleWindow(start?: string | null, end?: string | null): string {
  if (!start || !end) return 'Gün boyu';
  return `Her gün ${start}–${end}`;
}

export function ProductPublicationSummary({ product }: Readonly<{ product: Product }>): JSX.Element {
  return (
    <div className="space-y-2 text-sm text-on-surface">
      <p>
        <span className="font-medium text-on-surface-variant">Web yayını: </span>
        {product.isPublished ? 'Yayında' : 'Yayında değil (vitrinde tükendi görünür)'}
      </p>
      <p>
        <span className="font-medium text-on-surface-variant">Satış saati: </span>
        {formatSaleWindow(product.saleWindowStart, product.saleWindowEnd)} (Europe/Istanbul)
      </p>
    </div>
  );
}
