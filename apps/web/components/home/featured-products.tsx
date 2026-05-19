import type { Product } from '../../lib/catalog/types';
import { ProductGrid } from '../catalog/product-grid';

export function FeaturedProducts({ products }: Readonly<{ products: Product[] }>): React.JSX.Element {
  return (
    <section className="mt-10">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">Öne çıkanlar</p>
      <h2 className="mt-2 text-2xl font-semibold">Bugünün vitrini</h2>
      <div className="mt-5"><ProductGrid products={products} /></div>
    </section>
  );
}
