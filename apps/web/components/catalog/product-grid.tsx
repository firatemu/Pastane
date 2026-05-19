import type { Product } from '../../lib/catalog/types';
import { ProductCard } from './product-card';

export function ProductGrid({ products }: Readonly<{ products: Product[] }>): React.JSX.Element {
  if (!products.length) return <div className="rounded-[2rem] border border-dashed border-amber-300 bg-white/70 p-8 text-center text-stone-600">Bu kategoride henüz aktif ürün bulunmuyor.</div>;
  return <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div>;
}
