import { fallbackImages } from '../data/fallback';
import type { CartItem, Product } from '../types';

export function productImageUrl(product: Pick<Product, 'images'> | CartItem['product']): string {
  const images = product.images ?? [];
  const primary = images.find((i) => i.isPrimary) ?? images[0];
  return primary?.url ?? fallbackImages.pastry;
}
