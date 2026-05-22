import type { Product } from '../../lib/catalog/types';
import { stitchImages } from '../../lib/stitch-design';
import { ProductGrid } from '../catalog/product-grid';

export function FeaturedProducts({ products }: Readonly<{ products: Product[] }>): React.JSX.Element {
  return (
    <section className="py-20" id="collections">
      <div className="mb-14 text-center">
        <p className="stitch-eyebrow">Curated Collections</p>
        <h2 className="mt-3 font-display text-4xl font-semibold text-primary">Artisan Creations</h2>
        <div className="mx-auto mt-5 h-px w-12 bg-outline-soft" />
      </div>
      <div className="mb-16 grid gap-6 md:grid-cols-3">
        {[
          ['Botanical Mille-Feuille', stitchImages.pastry],
          ['Dark Chocolate Tart', stitchImages.tart],
          ['Morning Croissant', stitchImages.croissant],
        ].map(([title, image]) => (
          <article className="group relative overflow-hidden rounded-3xl border border-outline-soft/50 bg-surface-lowest" key={title}>
            <div className="aspect-[4/5] overflow-hidden">
              <img alt={title} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" src={image} />
            </div>
            <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-primary/85 to-transparent p-6 opacity-0 transition duration-300 group-hover:opacity-100">
              <h3 className="font-display text-2xl font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm font-bold uppercase tracking-[0.14em] text-gold">Chef selection</p>
            </div>
          </article>
        ))}
      </div>
      <div className="mb-8 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="stitch-eyebrow">Öne çıkan lezzetler</p>
          <h2 className="mt-2 font-display text-4xl font-bold text-primary">Bugünün vitrini</h2>
        </div>
        <a className="text-sm font-bold uppercase tracking-[0.14em] text-primary hover:text-secondary" href="/shop">Tümünü gör</a>
      </div>
      <ProductGrid products={products} />
    </section>
  );
}
