import type { Metadata } from 'next';
import { Breadcrumbs } from '../../../components/catalog/breadcrumbs';
import { ShopCatalog } from '../../../components/catalog/shop-catalog';
import { getCategories, getProducts } from '../../../lib/catalog/queries';
import { absoluteUrl } from '../../../lib/seo/metadata';

export const metadata: Metadata = {
  title: 'Shop',
  description: 'Pastanenin tüm aktif ürünlerini tek vitrinde keşfet.',
  alternates: { canonical: absoluteUrl('/shop') },
  openGraph: {
    title: 'Shop',
    description: 'Pastanenin tüm aktif ürünlerini tek vitrinde keşfet.',
  },
};

export default async function ShopPage(): Promise<React.JSX.Element> {
  const [categories, products] = await Promise.all([
    getCategories(),
    getProducts({ page: 1, limit: 100 }),
  ]);

  return (
    <main className="stitch-container py-6">
      <Breadcrumbs items={[{ label: 'Ana sayfa', href: '/' }, { label: 'Shop' }]} />
      <header className="mt-4 border-b border-outline-soft/30 pb-6">
        <div>
          <p className="stitch-eyebrow">Shop</p>
          <h1 className="mt-2 font-display text-4xl font-bold leading-tight text-primary sm:text-5xl">Tüm ürünler</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
            Günlük üretimden pastalara, tatlılardan fırın klasiklerine kadar vitrindeki tüm lezzetler.
          </p>
        </div>
      </header>

      <ShopCatalog categories={categories} products={products.items} />
    </main>
  );
}
