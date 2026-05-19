import { ReviewStatus } from '@prisma/client';
import { ReviewsService } from './reviews.service';

describe('ReviewsService', () => {
  it('soft deletes reviews', async () => {
    const update = jest.fn().mockResolvedValue({ id: 'review-1', deletedAt: new Date() });
    const prisma = { review: { findFirst: jest.fn().mockResolvedValue({ id: 'review-1', status: ReviewStatus.PENDING }), update } } as never;
    const service = new ReviewsService(prisma, { log: jest.fn() } as never);
    await service.remove('review-1');
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'review-1' }, data: { deletedAt: expect.any(Date) } }));
  });

  it('rejects moderating a non-pending review', async () => {
    const prisma = { review: { findFirst: jest.fn().mockResolvedValue({ id: 'review-1', status: ReviewStatus.APPROVED }) } } as never;
    const service = new ReviewsService(prisma, { log: jest.fn() } as never);
    await expect(service.approve('review-1')).rejects.toThrow('Review is not pending');
  });

  it('creates pending reviews only for delivered own order items', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'review-1', status: ReviewStatus.PENDING })
    const prisma = {
      orderItem: {
        findFirst: jest.fn().mockResolvedValue({ id: 'item-1', productId: 'product-1', review: null }),
      },
      review: { create },
    } as never
    const service = new ReviewsService(prisma, { log: jest.fn() } as never)

    await service.create('user-1', { orderItemId: 'item-1', rating: 5 })

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        productId: 'product-1',
        orderItemId: 'item-1',
        status: ReviewStatus.PENDING,
      }),
    })
  })

  it('returns only approved non-deleted product reviews publicly', async () => {
    const findMany = jest.fn().mockResolvedValue([])
    const count = jest.fn().mockResolvedValue(0)
    const prisma = {
      $transaction: jest.fn(async (queries: Promise<unknown>[]) => Promise.all(queries)),
      review: { findMany, count },
    } as never
    const service = new ReviewsService(prisma, { log: jest.fn() } as never)

    await service.product('product-1', {})

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { productId: 'product-1', status: ReviewStatus.APPROVED, deletedAt: null },
      }),
    )
  })
});
