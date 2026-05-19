import type { Metadata } from 'next';
import { Breadcrumbs } from '../../../../components/catalog/breadcrumbs';
import { AllergenList } from '../../../../components/product/allergen-list';
import { ProductGallery } from '../../../../components/product/product-gallery';
import { ProductOptionsForm } from '../../../../components/product/product-options-form';
import { ProductReviews } from '../../../../components/product/product-reviews';
import { Price } from '../../../../components/shared/price';
import { getProductBySlug, getProductReviews } from '../../../../lib/catalog/queries';
import { absoluteUrl } from '../../../../lib/seo/metadata';
import { breadcrumbJsonLd, productJsonLd } from '../../../../lib/seo/structured-data';

export async function generateMetadata({ params }: Readonly<{ params: Promise<{ slug: string }> }>): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  const primaryImage = product.images.find((image) => image.isPrimary) ?? product.images[0];
  return {
    title: product.name,
    description: product.shortDescription ?? product.description ?? `${product.name} ürün detayları.`,
    alternates: { canonical: absoluteUrl(`/urun/${product.slug}`) },
    openGraph: {
      title: product.name,
      description: product.shortDescription ?? product.description ?? product.name,
      images: primaryImage ? [primaryImage.url] : [],
    },
  };
}

export default async function ProductPage({ params }: Readonly<{ params: Promise<{ slug: string }> }>): Promise<React.JSX.Element> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  const reviews = await getProductReviews(product.id);
  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Ana sayfa', path: '/' },
    { name: product.category.name, path: `/kategori/${product.category.slug}` },
    { name: product.name, path: `/urun/${product.slug}` },
  ]);
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <script dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} type="application/ld+json" />
      <script dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd(product, reviews)) }} type="application/ld+json" />
      <Breadcrumbs items={[{ label: 'Ana sayfa', href: '/' }, { label: product.category.name, href: `/kategori/${product.category.slug}` }, { label: product.name }]} />
      <section className="mt-6 grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <ProductGallery product={product} />
        <div className="space-y-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">{product.category.name}</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight">{product.name}</h1>
            <div className="mt-4"><Price value={product.discountedPrice ?? product.price} previous={product.discountedPrice ? product.price : null} /></div>
            {product.preparationMinutes ? <p className="mt-3 text-sm text-stone-500">Hazırlık süresi yaklaşık {product.preparationMinutes} dakika.</p> : null}
          </div>
          <p className="text-base leading-7 text-stone-700">{product.description ?? product.shortDescription ?? 'Taze hazırlanır.'}</p>
          <AllergenList allergens={product.allergens} />
          <ProductOptionsForm product={product} />
        </div>
      </section>
      <ProductReviews reviews={reviews} />
    </main>
  );
}
