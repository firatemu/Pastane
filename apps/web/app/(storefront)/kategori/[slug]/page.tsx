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
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <script dangerouslySetInnerHTML={{ __html: JSON.stringify(categoryBreadcrumbs(category)) }} type="application/ld+json" />
      <Breadcrumbs items={[{ label: 'Ana sayfa', href: '/' }, { label: category.name }]} />
      <header className="mb-8 mt-5 grid gap-5 lg:grid-cols-[1fr_260px] lg:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">Kategori</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">{category.name}</h1>
          {category.description ? <p className="mt-3 max-w-2xl text-stone-600">{category.description}</p> : null}
          {category.children?.length ? <div className="mt-4 flex flex-wrap gap-2">{category.children.map((child) => <a className="rounded-full border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:bg-amber-50" href={`/kategori/${child.slug}`} key={child.id}>{child.name}</a>)}</div> : null}
        </div>
        {category.imageUrl ? <img alt={`${category.name} kategori görseli`} className="aspect-[4/3] w-full rounded-[2rem] object-cover" src={category.imageUrl} /> : null}
      </header>
      <ProductGrid products={products.items} />
    </main>
  );
}