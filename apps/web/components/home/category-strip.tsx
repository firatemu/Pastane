import type { Category } from '../../lib/catalog/types';
import { stitchImages } from '../../lib/stitch-design';

export function CategoryStrip({ categories }: Readonly<{ categories: Category[] }>): React.JSX.Element {
  return (
    <section className="bg-[#fffaf0] py-12">
      <div className="stitch-container mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="stitch-eyebrow">Lezzet kategorileri</p>
          <h2 className="mt-2 font-display text-3xl font-bold text-primary sm:text-4xl">Ne canın çekti?</h2>
        </div>
        <a className="text-sm font-bold uppercase tracking-[0.14em] text-primary hover:text-secondary" href="/shop">Tüm vitrini gez</a>
      </div>
      {categories.length ? (
        <div className="stitch-container grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
          {categories.slice(0, 7).map((category) => (
            <a className="group overflow-hidden rounded-3xl border border-amber-100 bg-white shadow-soft transition hover:-translate-y-1 hover:border-honey hover:shadow-ambient" href={`/kategori/${category.slug}`} key={category.id}>
              <span className="block aspect-square overflow-hidden bg-surface-low">
                <img
                  alt={`${category.name} kategori görseli`}
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  src={category.imageUrl ?? stitchImages.pastry}
                />
              </span>
              <span className="block px-3 py-3 text-center text-sm font-extrabold leading-tight text-primary transition group-hover:text-secondary">{category.name}</span>
            </a>
          ))}
        </div>
      ) : <p className="stitch-panel mx-auto max-w-stitch-container rounded-3xl p-5 text-sm text-muted">Henüz aktif kategori yayınlanmadı.</p>}
    </section>
  );
}
