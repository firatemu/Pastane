import type { Product } from '../../lib/catalog/types';
import { Price } from '../shared/price';

export function ProductCard({ product }: Readonly<{ product: Product }>): React.JSX.Element {
  const image = product.images.find((item) => item.isPrimary) ?? product.images[0];
  const activeOptionGroups = product.optionGroups.filter((group) => group.options.some((option) => option.isActive));
  const allergenNames = product.allergens.map(({ allergen }) => allergen.name).slice(0, 2);
  return (
    <article className="overflow-hidden rounded-[1.75rem] border border-amber-200/70 bg-white shadow-sm">
      <a href={`/urun/${product.slug}`}>
        <div className="relative aspect-[4/3] bg-gradient-to-br from-amber-100 via-rose-50 to-orange-100">
          {product.discountedPrice ? <span className="absolute left-4 top-4 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">İndirimli</span> : null}
          {image ? <img alt={image.altText ?? product.name} className="h-full w-full object-cover" src={image.url} /> : <div className="flex h-full items-end p-5 text-sm text-stone-500">Ürün fotoğrafı yakında</div>}
        </div>
        <div className="space-y-3 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">{product.category.name}</p>
            <h2 className="mt-2 text-xl font-semibold text-stone-950">{product.name}</h2>
          </div>
          <p className="line-clamp-2 min-h-10 text-sm leading-5 text-stone-600">{product.shortDescription ?? product.description ?? 'Taze hazırlanır.'}</p>
          <div className="flex flex-wrap gap-2 text-xs text-stone-600">
            {product.preparationMinutes ? <span className="rounded-full bg-stone-100 px-2.5 py-1">~{product.preparationMinutes} dk</span> : null}
            {activeOptionGroups.length ? <span className="rounded-full bg-stone-100 px-2.5 py-1">Özelleştirilebilir</span> : null}
            {allergenNames.length ? <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-900">Alerjen: {allergenNames.join(', ')}{product.allergens.length > allergenNames.length ? '…' : ''}</span> : null}
          </div>
          <Price value={product.discountedPrice ?? product.price} previous={product.discountedPrice ? product.price : null} />
        </div>
      </a>
    </article>
  );
}