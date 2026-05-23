import type { Product } from '../catalog/types';

export function productLabel(product: Pick<Product, 'name' | 'displayName'>): string {
  return product.displayName ?? product.name;
}
