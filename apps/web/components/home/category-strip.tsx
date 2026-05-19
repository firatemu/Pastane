import type { Category } from '../../lib/catalog/types';

export function CategoryStrip({ categories }: Readonly<{ categories: Category[] }>): React.JSX.Element {
  return (
    <section className="mt-10">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">Kategoriler</p>
          <h2 className="mt-2 text-2xl font-semibold">Ne arıyorsun?</h2>
        </div>
      </div>
      {categories.length ? (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {categories.map((category) => (
            <a className="shrink-0 rounded-3xl border border-amber-300 bg-white px-5 py-3 font-medium text-stone-800 hover:bg-amber-50" href={`/kategori/${category.slug}`} key={category.id}>
              <span>{category.name}</span>
              {category.children?.length ? <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900">+{category.children.length}</span> : null}
              {category.description ? <span className="mt-1 block max-w-48 truncate text-xs font-normal text-stone-500">{category.description}</span> : null}
            </a>
          ))}
        </div>
      ) : <p className="rounded-[2rem] border border-dashed border-amber-300 bg-white/70 p-5 text-sm text-stone-600">Henüz aktif kategori yayınlanmadı.</p>}
    </section>
  );
}