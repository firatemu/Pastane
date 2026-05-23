import type { Metadata } from 'next';
import { Breadcrumbs } from '../../../../components/catalog/breadcrumbs';
import { AllergenList } from '../../../../components/product/allergen-list';
import { ProductGallery } from '../../../../components/product/product-gallery';
import { ProductOptionsForm } from '../../../../components/product/product-options-form';
import { ProductReviews } from '../../../../components/product/product-reviews';
import { Price } from '../../../../components/shared/price';
import { getProductBySlug, getProductReviews } from '../../../../lib/catalog/queries';
import { productLabel } from '../../../../lib/catalog/product-label';
import { absoluteUrl } from '../../../../lib/seo/metadata';
import { breadcrumbJsonLd, productJsonLd } from '../../../../lib/seo/structured-data';

export async function generateMetadata({ params }: Readonly<{ params: Promise<{ slug: string }> }>): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  const primaryImage = product.images.find((image) => image.isPrimary) ?? product.images[0];
  return {
    title: productLabel(product),
    description: product.shortDescription ?? product.description ?? `${productLabel(product)} ürün detayları.`,
    alternates: { canonical: absoluteUrl(`/urun/${product.slug}`) },
    openGraph: {
      title: productLabel(product),
      description: product.shortDescription ?? product.description ?? productLabel(product),
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
    { name: productLabel(product), path: `/urun/${product.slug}` },
  ]);
  return (
    <main className="stitch-container py-10">
      <script dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} type="application/ld+json" />
      <script dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd(product, reviews)) }} type="application/ld+json" />
      <Breadcrumbs items={[{ label: 'Ana sayfa', href: '/' }, { label: product.category.name, href: `/kategori/${product.category.slug}` }, { label: productLabel(product) }]} />
      <section className="mt-8 grid gap-10 lg:grid-cols-[0.95fr_1.05fr]">
        <ProductGallery product={product} />
        <div className="stitch-panel rounded-3xl p-6 sm:p-8">
          <div>
            <p className="stitch-eyebrow">{product.category.name}</p>
            <h1 className="mt-3 font-body text-4xl font-extrabold leading-tight text-primary sm:text-5xl">{productLabel(product)}</h1>
            <div className="mt-4"><Price value={product.discountedPrice ?? product.price} previous={product.discountedPrice ? product.price : null} tone="danger" /></div>
            {product.preparationMinutes ? <p className="mt-3 text-sm text-muted">Hazırlık süresi yaklaşık {product.preparationMinutes} dakika.</p> : null}
          </div>
          <p className="mt-6 text-base leading-7 text-muted">{product.description ?? product.shortDescription ?? 'Taze hazırlanır.'}</p>
          <AllergenList allergens={product.allergens} />
          <ProductOptionsForm product={product} />
        </div>
      </section>
      <ProductReviews reviews={reviews} />
    </main>
  );
}
