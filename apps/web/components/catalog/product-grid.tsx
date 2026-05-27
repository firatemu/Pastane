import type { Product } from '../../lib/catalog/types';
import { ProductCard } from './product-card';

export function ProductGrid({ products, emptyLabel = 'Bu kategoride henüz aktif ürün bulunmuyor.' }: Readonly<{ products: Product[]; emptyLabel?: string }>): React.JSX.Element {
  if (!products.length) return <div className="stitch-panel rounded-3xl p-8 text-center text-muted">{emptyLabel}</div>;
  return <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div>;
}
