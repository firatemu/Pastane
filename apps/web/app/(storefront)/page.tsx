import type { Metadata } from 'next';
import { CategoryStrip } from '../../components/home/category-strip';
import { FeaturedProducts } from '../../components/home/featured-products';
import { HomeHero } from '../../components/home/hero';
import { PublicStorefrontInfo } from '../../components/home/public-storefront-info';
import { getActiveCampaigns, getCategories, getDeliveryZones, getHomeBanners, getProducts, getStores } from '../../lib/catalog/queries';
import { absoluteUrl } from '../../lib/seo/metadata';
import { organizationJsonLd } from '../../lib/seo/structured-data';

export const metadata: Metadata = {
  title: 'Taze pasta ve tatlılar',
  description: 'Pastane vitrini: taze pastalar, tatlılar ve fırın ürünleri.',
  alternates: { canonical: absoluteUrl('/') },
};

export default async function HomePage(): Promise<React.JSX.Element> {
  const [categories, products, banners, campaigns, stores, deliveryZones] = await Promise.all([
    getCategories(),
    getProducts({ page: 1, limit: 100 }),
    getHomeBanners(),
    getActiveCampaigns(),
    getStores({ page: 1, limit: 3 }).catch(() => ({ items: [], meta: { page: 1, limit: 3, total: 0, totalPages: 0 } })),
    getDeliveryZones({ page: 1, limit: 3 }).catch(() => ({ items: [], meta: { page: 1, limit: 3, total: 0, totalPages: 0 } })),
  ]);
  return (
    <main className="stitch-container">
      <script dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }} type="application/ld+json" />
      <HomeHero banners={banners} />
      <CategoryStrip categories={categories} />
      <PublicStorefrontInfo campaigns={campaigns} stores={stores.items} deliveryZones={deliveryZones.items} />
      <FeaturedProducts products={products.items} />
    </main>
  );
}
