import type { Metadata } from 'next';
import { CategoryStrip } from '../../components/home/category-strip';
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
  return (
    <main className="stitch-container">
      <script dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }} type="application/ld+json" />
      <HomeHero banners={banners} />
      <CategoryStrip categories={categoriesHavingProducts(categories, products.items)} />
    </main>
  );
}
