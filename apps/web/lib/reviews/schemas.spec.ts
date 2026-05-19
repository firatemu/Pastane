import { describe, expect, it } from 'vitest';
import { reviewSchema } from './schemas';
describe('reviewSchema', () => {
  it('accepts a valid pending review payload', () => { expect(reviewSchema.safeParse({ rating: 5, comment: 'Çok tazeydi.' }).success).toBe(true); });
  it('rejects ratings outside 1-5', () => { expect(reviewSchema.safeParse({ rating: 6 }).success).toBe(false); });
});
