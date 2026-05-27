import type { Metadata } from 'next';
import { CategoryStrip } from '../../components/home/category-strip';
import { FeaturedProducts } from '../../components/home/featured-products';
import { HomeHero } from '../../components/home/hero';
import { categoriesHavingProducts, getCategories, getHomeBanners, getProducts } from '../../lib/catalog/queries';
import { absoluteUrl } from '../../lib/seo/metadata';
import { organizationJsonLd } from '../../lib/seo/structured-data';

export const metadata: Metadata = {
  title: 'Taze pasta ve tatlılar',
  description: 'Pastane vitrini: taze pastalar, tatlılar ve fırın ürünleri.',
  alternates: { canonical: absoluteUrl('/') },
};

export default async function HomePage(): Promise<React.JSX.Element> {
  const [categories, products, banners] = await Promise.all([
    getCategories(),
    getProducts({ page: 1, limit: 100 }),
    getHomeBanners(),
  ]);
  const activeCategories = categoriesHavingProducts(categories, products.items);
  return (
    <main className="overflow-hidden">
      <script dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }} type="application/ld+json" />
      <HomeHero banners={banners} categories={activeCategories} products={products.items.slice(0, 4)} />
      <CategoryStrip categories={activeCategories} />
      <FeaturedProducts products={products.items} />
      <section className="bg-primary py-14 text-white">
        <div className="stitch-container grid gap-6 md:grid-cols-3">
          {[
            ['Günlük üretim', 'Pastalar, kurabiyeler ve fırın ürünleri her gün taze hazırlanır.'],
            ['Hızlı teslimat', 'Soğuk zincir gerektiren ürünlerde uygun paketleme ve planlı teslimat.'],
            ['Kolay sipariş', 'Vitrinden ürünü seç, tek dokunuşla sepete ekle ve güvenle tamamla.'],
          ].map(([title, text]) => (
            <article className="rounded-3xl border border-white/15 bg-white/8 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.16)]" key={title}>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">{title}</p>
              <p className="mt-3 text-sm leading-6 text-white/78">{text}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
