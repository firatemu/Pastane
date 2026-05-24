import type { Product } from '@/types';

export function hasRequiredOptions(product: Product): boolean {
  return (product.optionGroups ?? []).some((group) => group.isRequired);
}
