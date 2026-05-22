'use client';

import { useMemo, useState } from 'react';
import type { Category, Product } from '../../lib/catalog/types';
import { ProductGrid } from './product-grid';

export function ShopCatalog({ categories, products }: Readonly<{ categories: Category[]; products: Product[] }>): React.JSX.Element {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const filteredProducts = useMemo(() => {
    if (!selectedCategoryId) return products;
    return products.filter((product) => product.category.id === selectedCategoryId);
  }, [products, selectedCategoryId]);

  return (
    <div className="grid gap-10 py-12 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="stitch-panel rounded-3xl p-5">
          <p className="stitch-eyebrow">Kategoriler</p>
          <nav className="mt-5 flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0" aria-label="Ürün kategorileri">
            <button
              className={`whitespace-nowrap rounded-full border px-4 py-2 text-left text-sm font-semibold transition lg:w-full ${
                selectedCategoryId === null
                  ? 'border-primary bg-primary text-white'
                  : 'border-outline-soft/60 bg-surface-lowest text-primary hover:bg-surface-low'
              }`}
              onClick={() => setSelectedCategoryId(null)}
              type="button"
            >
              Tüm ürünler
            </button>
            {categories.map((category) => {
              const selected = category.id === selectedCategoryId;
              return (
                <button
                  className={`whitespace-nowrap rounded-full border px-4 py-2 text-left text-sm font-semibold transition lg:w-full ${
                    selected
                      ? 'border-primary bg-primary text-white'
                      : 'border-outline-soft/60 bg-surface-lowest text-primary hover:bg-surface-low'
                  }`}
                  key={category.id}
                  onClick={() => setSelectedCategoryId(category.id)}
                  type="button"
                >
                  {category.name}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      <section>
        <ProductGrid products={filteredProducts} emptyLabel="Bu kategoride henüz aktif ürün bulunmuyor." />
      </section>
    </div>
  );
}
