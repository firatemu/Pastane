import type { Metadata } from 'next';
import { Breadcrumbs } from '../../../../components/catalog/breadcrumbs';
import { AllergenList } from '../../../../components/product/allergen-list';
import { ProductGallery } from '../../../../components/product/product-gallery';
import { ProductOptionsForm } from '../../../../components/product/product-options-form';
import { ProductReviews } from '../../../../components/product/product-reviews';
import { ProductGrid } from '../../../../components/catalog/product-grid';
import { Price } from '../../../../components/shared/price';
import { getProductBySlug, getProductReviews, getProducts } from '../../../../lib/catalog/queries';
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
  const [reviews, relatedProducts] = await Promise.all([
    getProductReviews(product.id),
    getProducts({ categoryId: product.category.id, page: 1, limit: 5 }),
  ]);
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
          <div className="mt-6 grid gap-3 border-t border-outline-soft/30 pt-6 text-sm text-muted sm:grid-cols-3">
            <p className="rounded-2xl bg-surface-low px-4 py-3">Günlük taze üretim</p>
            <p className="rounded-2xl bg-surface-low px-4 py-3">Güvenli ödeme</p>
            <p className="rounded-2xl bg-surface-low px-4 py-3">Özenli paketleme</p>
          </div>
        </div>
      </section>
      <ProductReviews reviews={reviews} />
      <section className="mt-14 border-t border-outline-soft/30 pt-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="stitch-eyebrow">Benzer ürünler</p>
            <h2 className="mt-2 font-display text-3xl font-bold text-primary">Bu kategoriden diğer lezzetler</h2>
          </div>
          <a className="text-sm font-bold uppercase tracking-[0.14em] text-primary hover:text-secondary" href={`/kategori/${product.category.slug}`}>Kategoriye git</a>
        </div>
        <ProductGrid products={relatedProducts.items.filter((item) => item.id !== product.id).slice(0, 4)} emptyLabel="Bu kategoride başka ürün bulunmuyor." />
      </section>
    </main>
  );
}
