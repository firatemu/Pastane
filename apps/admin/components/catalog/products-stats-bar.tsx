import type { JSX } from 'react';
import type { Product } from '../../lib/catalog/types';
import { BakeryStatCard } from '../dashboard/bakery-stat-card';

export function ProductsStatsBar({ products }: Readonly<{ products: Product[] }>): JSX.Element {
  const total = products.length;
  const onSaleNow = products.filter((p) => p.isPurchasable).length;
  const unpublished = products.filter((p) => !p.isPublished).length;
  const withDiscount = products.filter((p) => p.discountedPrice != null && Number(p.discountedPrice) > 0).length;

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
      <BakeryStatCard size="minimal" label="Toplam ürün" value={String(total)} iconGoogle="bakery_dining" accent="surface" />
      <BakeryStatCard
        size="minimal"
        label="Şu an satışta"
        value={String(onSaleNow)}
        iconGoogle="check_circle"
        accent="tertiary"
      />
      <BakeryStatCard
        size="minimal"
        label="Yayında değil"
        value={String(unpublished)}
        iconGoogle="visibility_off"
        accent="alert"
        emphasized={unpublished > 0}
      />
      <BakeryStatCard
        size="minimal"
        label="İndirimli"
        value={String(withDiscount)}
        iconGoogle="sell"
        accent="secondary"
      />
    </div>
  );
}
