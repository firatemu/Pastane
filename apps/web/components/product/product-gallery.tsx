import type { Product } from '../../lib/catalog/types';
import { stitchImages } from '../../lib/stitch-design';

export function ProductGallery({ product }: Readonly<{ product: Product }>): React.JSX.Element {
  const images = product.images.length ? product.images : [];
  const primary = images.find((image) => image.isPrimary) ?? images[0];
  return (
    <div className="space-y-4">
      <div className="aspect-square overflow-hidden rounded-3xl border border-outline-soft/50 bg-surface-low shadow-soft">
        <img alt={primary?.altText ?? product.name} className="h-full w-full object-cover" src={primary?.url ?? stitchImages.cake} />
      </div>
      {images.length > 1 ? <div className="grid grid-cols-4 gap-3">{images.map((image) => <img alt={image.altText ?? product.name} className="aspect-square rounded-2xl border border-outline-soft/40 object-cover" key={image.id} src={image.url} />)}</div> : null}
    </div>
  );
}
