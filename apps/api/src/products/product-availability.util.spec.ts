import { ProductStatus } from '@prisma/client';
import { computeProductAvailability } from './product-availability.util';

describe('computeProductAvailability', () => {
  it('marks out-of-stock products as not purchasable', () => {
    expect(
      computeProductAvailability({
        status: ProductStatus.OUT_OF_STOCK,
        isPublished: true,
        deletedAt: null,
      }),
    ).toMatchObject({
      isVisiblePublic: true,
      isPurchasable: false,
      availabilityReason: 'OUT_OF_STOCK',
    });
  });

  it('marks unpublished products as not purchasable even when active and in stock', () => {
    expect(
      computeProductAvailability({
        status: ProductStatus.ACTIVE,
        isPublished: false,
        deletedAt: null,
      }),
    ).toMatchObject({
      isVisiblePublic: true,
      isPurchasable: false,
      availabilityReason: 'UNPUBLISHED',
    });
  });
});
