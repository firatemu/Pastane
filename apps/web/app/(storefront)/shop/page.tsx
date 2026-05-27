import type { Metadata } from 'next';
import { Breadcrumbs } from '../../../components/catalog/breadcrumbs';
import { ShopCatalog } from '../../../components/catalog/shop-catalog';
import { getCategories, getProducts } from '../../../lib/catalog/queries';
import { absoluteUrl } from '../../../lib/seo/metadata';

export const metadata: Metadata = {
  title: 'Vitrin',
  description: 'Pastanenin tüm aktif ürünlerini tek vitrinde keşfet.',
  alternates: { canonical: absoluteUrl('/shop') },
  openGraph: {
    title: 'Vitrin',
    description: 'Pastanenin tüm aktif ürünlerini tek vitrinde keşfet.',
  },
};

export default async function ShopPage({ searchParams }: Readonly<{ searchParams?: Promise<{ q?: string | string[] }> }>): Promise<React.JSX.Element> {
  const resolvedSearchParams = await searchParams;
  const q = Array.isArray(resolvedSearchParams?.q) ? resolvedSearchParams.q[0] : resolvedSearchParams?.q;
  const [categories, products] = await Promise.all([
    getCategories(),
    getProducts({ page: 1, limit: 100 }),
  ]);

  return (
    <main className="stitch-container py-8">
      <Breadcrumbs items={[{ label: 'Ana sayfa', href: '/' }, { label: 'Vitrin' }]} />
      <header className="mt-4 overflow-hidden rounded-[2rem] bg-primary p-6 text-white shadow-ambient sm:p-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Vitrin</p>
          <h1 className="mt-2 font-display text-4xl font-bold leading-tight sm:text-5xl">Tüm ürünler</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/75">
            Günlük üretimden pastalara, tatlılardan fırın klasiklerine kadar vitrindeki tüm lezzetler.
          </p>
        </div>
      </header>

      <ShopCatalog categories={categories} initialQuery={q ?? ''} products={products.items} />
    </main>
  );
}
