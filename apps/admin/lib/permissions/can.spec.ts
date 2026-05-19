import { describe, expect, it } from 'vitest';
import { can, canAccessAdmin } from './can';

describe('admin permissions', () => {
  it('allows admin application roles only', () => {
    expect(canAccessAdmin('ADMIN')).toBe(true);
    expect(canAccessAdmin('ORDER_OPERATOR')).toBe(true);
    expect(canAccessAdmin('PRODUCT_MANAGER')).toBe(true);
    expect(canAccessAdmin('CUSTOMER')).toBe(false);
    expect(canAccessAdmin('COURIER')).toBe(false);
  });

  it('shows navigation when any required permission exists', () => {
    expect(can(['orders.viewAll'], ['orders.viewAll', 'orders.assignCourier'])).toBe(true);
    expect(can(['products.view'], ['orders.viewAll'])).toBe(false);
    expect(can([], [])).toBe(true);
  });
});
