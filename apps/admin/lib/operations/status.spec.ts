import { describe, expect, it } from 'vitest';
import { NEXT_STATUS } from './status';

describe('order status presentation map', () => {
  it('matches approved operational flow (admin cannot confirm unpaid orders)', () => {
    expect(NEXT_STATUS.PAYMENT_PENDING).toEqual(['CANCELLED']);
    expect(NEXT_STATUS.CONFIRMED).not.toContain('PAYMENT_PENDING');
    expect(NEXT_STATUS.DELIVERED).toEqual(['CANCELLED']);
    expect(NEXT_STATUS.OUT_FOR_DELIVERY).toContain('DELIVERY_FAILED');
    expect(NEXT_STATUS.DELIVERY_FAILED).toEqual(['CANCELLED', 'READY']);
  });
});

