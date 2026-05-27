'use client';

import { useMemo, useState } from 'react';
import type { Category, Product } from '../../lib/catalog/types';
import { ProductGrid } from './product-grid';

export function ShopCatalog({ categories, initialQuery = '', products }: Readonly<{ categories: Category[]; initialQuery?: string; products: Product[] }>): React.JSX.Element {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('tr-TR');
    return products.filter((product) => {
      const categoryMatches = !selectedCategoryId || product.category.id === selectedCategoryId;
      if (!categoryMatches) return false;
      if (!normalized) return true;
      return [
        product.name,
        product.displayName,
        product.shortDescription,
        product.description,
        product.category.name,
      ].filter(Boolean).some((value) => String(value).toLocaleLowerCase('tr-TR').includes(normalized));
    });
  }, [products, query, selectedCategoryId]);

  return (
    <div className="grid gap-8 py-10 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="stitch-panel rounded-3xl p-5">
          <p className="stitch-eyebrow">Kategoriler</p>
          <label className="mt-4 block">
            <span className="sr-only">Ürün ara</span>
            <input
              className="w-full rounded-2xl border border-outline-soft/60 bg-surface-lowest px-4 py-3 text-sm font-semibold text-primary outline-none transition placeholder:text-muted/60 focus:border-primary"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Pasta, cookie, dondurma ara"
              type="search"
              value={query}
            />
          </label>
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
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="stitch-eyebrow">Vitrin</p>
            <h1 className="mt-2 font-display text-4xl font-bold text-primary">Siparişe hazır ürünler</h1>
          </div>
          <p className="text-sm font-semibold text-muted">{filteredProducts.length} ürün gösteriliyor</p>
        </div>
        <ProductGrid products={filteredProducts} emptyLabel="Bu kategoride henüz aktif ürün bulunmuyor." />
      </section>
    </div>
  );
}
