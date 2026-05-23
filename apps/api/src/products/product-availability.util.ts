import { ProductStatus } from '@prisma/client';
import { isTimeWindowValid, timeFallsWithinWindow } from '../common/utils/time-window.util';

export type ProductAvailabilityReason = 'UNPUBLISHED' | 'OUTSIDE_SALE_WINDOW' | 'INACTIVE' | 'OUT_OF_STOCK';

export type ProductAvailabilityInput = {
  status: ProductStatus;
  isPublished: boolean;
  saleWindowStart?: string | null;
  saleWindowEnd?: string | null;
  deletedAt?: Date | null;
};

export type ProductAvailability = {
  isVisiblePublic: boolean;
  isPurchasable: boolean;
  availabilityReason: ProductAvailabilityReason | null;
};

function istanbulNowHhmm(at: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Istanbul',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(at);
}

export function computeProductAvailability(
  product: ProductAvailabilityInput,
  at: Date = new Date(),
): ProductAvailability {
  if (product.deletedAt || product.status === ProductStatus.INACTIVE) {
    return { isVisiblePublic: false, isPurchasable: false, availabilityReason: 'INACTIVE' };
  }

  if (product.status === ProductStatus.OUT_OF_STOCK) {
    return { isVisiblePublic: true, isPurchasable: false, availabilityReason: 'OUT_OF_STOCK' };
  }

  if (!product.isPublished) {
    return { isVisiblePublic: true, isPurchasable: false, availabilityReason: 'UNPUBLISHED' };
  }

  const start = product.saleWindowStart ?? undefined;
  const end = product.saleWindowEnd ?? undefined;
  if (start || end) {
    if (!isTimeWindowValid(start, end)) {
      return { isVisiblePublic: true, isPurchasable: false, availabilityReason: 'OUTSIDE_SALE_WINDOW' };
    }
    if (!timeFallsWithinWindow(istanbulNowHhmm(at), start, end)) {
      return { isVisiblePublic: true, isPurchasable: false, availabilityReason: 'OUTSIDE_SALE_WINDOW' };
    }
  }

  return { isVisiblePublic: true, isPurchasable: true, availabilityReason: null };
}

export function withProductAvailability<T extends ProductAvailabilityInput>(product: T, at?: Date) {
  const availability = computeProductAvailability(product, at);
  return { ...product, ...availability };
}
