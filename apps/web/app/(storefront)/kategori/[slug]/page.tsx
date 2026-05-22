import type { Metadata } from 'next';
import { Breadcrumbs } from '../../../../components/catalog/breadcrumbs';
import { ProductGrid } from '../../../../components/catalog/product-grid';
import { getCategoryBySlug, getProducts } from '../../../../lib/catalog/queries';
import { absoluteUrl } from '../../../../lib/seo/metadata';
import { categoryBreadcrumbs } from '../../../../lib/seo/structured-data';

export async function generateMetadata({ params }: Readonly<{ params: Promise<{ slug: string }> }>): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  return {
    title: category.name,
    description: category.description ?? `${category.name} kategorisindeki aktif pastane ürünlerini keşfet.`,
    alternates: { canonical: absoluteUrl(`/kategori/${category.slug}`) },
    openGraph: {
      title: category.name,
      description: category.description ?? `${category.name} kategorisindeki aktif pastane ürünlerini keşfet.`,
      images: category.imageUrl ? [category.imageUrl] : [],
    },
  };
}

export default async function CategoryPage({ params }: Readonly<{ params: Promise<{ slug: string }> }>): Promise<React.JSX.Element> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  const products = await getProducts({ categoryId: category.id, page: 1, limit: 12 });
  return (
    <main className="stitch-container py-10">
      <script dangerouslySetInnerHTML={{ __html: JSON.stringify(categoryBreadcrumbs(category)) }} type="application/ld+json" />
      <Breadcrumbs items={[{ label: 'Ana sayfa', href: '/' }, { label: category.name }]} />
      <header className="mb-12 mt-6 grid gap-8 border-b border-outline-soft/30 pb-12 lg:grid-cols-[1fr_360px] lg:items-end">
        <div>
          <p className="stitch-eyebrow">Kategori</p>
          <h1 className="stitch-title mt-3">{category.name}</h1>
          {category.description ? <p className="mt-5 max-w-2xl text-base leading-7 text-muted">{category.description}</p> : null}
          {category.children?.length ? <div className="mt-6 flex flex-wrap gap-2">{category.children.map((child) => <a className="rounded-full border border-outline-soft/60 bg-surface-lowest px-4 py-2 text-sm font-semibold text-primary hover:bg-surface-low" href={`/kategori/${child.slug}`} key={child.id}>{child.name}</a>)}</div> : null}
        </div>
        {category.imageUrl ? <img alt={`${category.name} kategori görseli`} className="aspect-[4/3] w-full rounded-3xl border border-outline-soft/40 object-cover shadow-soft" src={category.imageUrl} /> : null}
      </header>
      <ProductGrid products={products.items} />
    </main>
  );
}
