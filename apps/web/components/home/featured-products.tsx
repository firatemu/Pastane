import type { Product } from '../../lib/catalog/types';
import { stitchImages } from '../../lib/stitch-design';
import { ProductGrid } from '../catalog/product-grid';

export function FeaturedProducts({ products }: Readonly<{ products: Product[] }>): React.JSX.Element {
  const showcaseProducts = products.slice(0, 3);
  return (
    <section className="bg-background py-16 sm:py-20" id="collections">
      <div className="stitch-container">
        <div className="mb-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <p className="stitch-eyebrow">Çok satanlar</p>
            <h2 className="mt-2 font-display text-4xl font-bold leading-tight text-primary sm:text-5xl">Bugünün iştah açan vitrini</h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted">Pastalar, tatlılar, dondurma ve fırından çıkan sıcak lezzetler. Sepete ekle butonu her kartta hazır.</p>
          </div>
          {showcaseProducts.length ? (
            <div className="grid gap-3 sm:grid-cols-3">
              {showcaseProducts.map((product) => {
                const image = product.images.find((item) => item.isPrimary) ?? product.images[0];
                return (
                  <a className="group relative min-h-48 overflow-hidden rounded-3xl bg-primary text-white shadow-soft" href={`/urun/${product.slug}`} key={product.id}>
                    <img
                      alt={image?.altText ?? product.name}
                      className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                      src={image?.url ?? stitchImages.pastry}
                    />
                    <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <span className="absolute inset-x-0 bottom-0 p-4">
                      <span className="block text-xs font-bold uppercase tracking-[0.14em] text-gold">{product.category.name}</span>
                      <span className="mt-1 block font-display text-xl font-bold leading-tight">{product.name}</span>
                    </span>
                  </a>
                );
              })}
            </div>
          ) : null}
        </div>
        <div className="mb-7 flex items-center justify-between gap-4">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-muted">Hızlı sipariş</p>
          <a className="text-sm font-bold uppercase tracking-[0.14em] text-primary hover:text-secondary" href="/shop">Tümünü gör</a>
        </div>
        <ProductGrid products={products.slice(0, 12)} />
      </div>
    </section>
  );
}
