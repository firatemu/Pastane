import { describe, expect, it } from 'vitest';
import { getAdminWorkflowTargets, NEXT_STATUS } from './status';

describe('order status presentation map', () => {
  it('matches approved operational flow (admin cannot confirm unpaid orders)', () => {
    expect(NEXT_STATUS.PAYMENT_PENDING).toEqual(['CANCELLED']);
    expect(NEXT_STATUS.CONFIRMED).not.toContain('PAYMENT_PENDING');
    expect(NEXT_STATUS.PREPARING).toEqual(['ASSIGNED_TO_COURIER', 'DELIVERED']);
    expect(NEXT_STATUS.DELIVERED).toEqual(['CANCELLED']);
    expect(NEXT_STATUS.OUT_FOR_DELIVERY).toContain('DELIVERY_FAILED');
    expect(NEXT_STATUS.DELIVERY_FAILED).toEqual(['CANCELLED', 'ASSIGNED_TO_COURIER']);
  });

  it('hides courier-managed delivery steps from admin workflow buttons', () => {
    expect(getAdminWorkflowTargets({ status: 'PREPARING', deliveryType: 'HOME_DELIVERY' })).toEqual([]);
    expect(getAdminWorkflowTargets({ status: 'ASSIGNED_TO_COURIER', deliveryType: 'HOME_DELIVERY' })).toEqual([]);
    expect(getAdminWorkflowTargets({ status: 'DELIVERY_FAILED', deliveryType: 'HOME_DELIVERY' })).toEqual([
      'CANCELLED',
    ]);
    expect(getAdminWorkflowTargets({ status: 'PREPARING', deliveryType: 'PICKUP' })).toEqual([
      'DELIVERED',
    ]);
  });
});

