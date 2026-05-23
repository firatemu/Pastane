import { computeProductAvailability, type ProductAvailabilityInput } from './product-availability.util';
import { formatProductDisplayName, type ProductDisplayInput } from './product-display.util';

export type ProductPresentationInput = ProductAvailabilityInput &
  ProductDisplayInput & {
    unit?: ProductDisplayInput['unit'];
  };

export function withProductPresentation<T extends ProductPresentationInput>(product: T, at?: Date) {
  const availability = computeProductAvailability(product, at);
  return {
    ...product,
    ...availability,
    displayName: formatProductDisplayName(product),
  };
}
