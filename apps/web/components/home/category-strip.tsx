import type { Category } from '../../lib/catalog/types';
import { categoryGlyphs } from '../../lib/stitch-design';

export function CategoryStrip({ categories }: Readonly<{ categories: Category[] }>): React.JSX.Element {
  return (
    <section className="-mx-4 border-b border-outline-soft/20 bg-surface px-4 py-12 sm:-mx-6 sm:px-6 lg:-mx-12 lg:px-12">
      {categories.length ? (
        <div className="mx-auto flex max-w-stitch-container gap-8 overflow-x-auto pb-2 md:justify-center md:gap-14">
          {categories.slice(0, 6).map((category, index) => (
            <a className="group flex shrink-0 flex-col items-center gap-3 text-center" href={`/kategori/${category.slug}`} key={category.id}>
              <span className="flex h-20 w-20 items-center justify-center rounded-full border border-outline-soft/50 bg-surface-lowest text-lg font-bold uppercase text-primary shadow-soft transition group-hover:border-primary md:h-24 md:w-24">
                {categoryGlyphs[index % categoryGlyphs.length]}
              </span>
              <span className="max-w-32 text-xs font-bold uppercase tracking-[0.16em] text-muted transition group-hover:text-primary">{category.name}</span>
            </a>
          ))}
        </div>
      ) : <p className="stitch-panel mx-auto max-w-stitch-container rounded-3xl p-5 text-sm text-muted">Henüz aktif kategori yayınlanmadı.</p>}
    </section>
  );
}
