import type { Category } from '../../lib/catalog/types';
import { stitchImages } from '../../lib/stitch-design';

export function CategoryStrip({ categories }: Readonly<{ categories: Category[] }>): React.JSX.Element {
  return (
    <section className="-mx-4 border-b border-outline-soft/20 bg-surface px-4 py-12 sm:-mx-6 sm:px-6 lg:-mx-12 lg:px-12">
      {categories.length ? (
        <div className="mx-auto grid max-w-stitch-container grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {categories.map((category) => (
            <a className="group overflow-hidden rounded-2xl border border-outline-soft/50 bg-surface-lowest shadow-soft transition hover:-translate-y-1 hover:shadow-ambient" href={`/kategori/${category.slug}`} key={category.id}>
              <span className="block aspect-[4/3] overflow-hidden bg-surface-low">
                <img
                  alt={`${category.name} kategori görseli`}
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  src={category.imageUrl ?? stitchImages.pastry}
                />
              </span>
              <span className="block px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.12em] text-muted transition group-hover:text-primary">{category.name}</span>
            </a>
          ))}
        </div>
      ) : <p className="stitch-panel mx-auto max-w-stitch-container rounded-3xl p-5 text-sm text-muted">Henüz aktif kategori yayınlanmadı.</p>}
    </section>
  );
}
