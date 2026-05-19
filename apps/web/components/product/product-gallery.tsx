import type { Product } from '../../lib/catalog/types';

export function ProductGallery({ product }: Readonly<{ product: Product }>): React.JSX.Element {
  const images = product.images.length ? product.images : [];
  const primary = images.find((image) => image.isPrimary) ?? images[0];
  return (
    <div className="space-y-4">
      <div className="aspect-square overflow-hidden rounded-[2rem] bg-gradient-to-br from-amber-100 via-rose-50 to-orange-100">
        {primary ? <img alt={primary.altText ?? product.name} className="h-full w-full object-cover" src={primary.url} /> : <div className="flex h-full items-end p-6 text-stone-500">Ürün fotoğrafı yakında</div>}
      </div>
      {images.length > 1 ? <div className="grid grid-cols-4 gap-3">{images.map((image) => <img alt={image.altText ?? product.name} className="aspect-square rounded-2xl object-cover" key={image.id} src={image.url} />)}</div> : null}
    </div>
  );
}
