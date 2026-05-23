import type { Product } from '@/types';

export function productLabel(product: Pick<Product, 'name' | 'displayName'>): string {
  return product.displayName ?? product.name;
}
