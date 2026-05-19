import { describe, expect, it } from 'vitest';
import { canAccessCustomer } from '../permissions/can';

describe('customer access', () => {
  it('allows only CUSTOMER role', () => {
    expect(canAccessCustomer('CUSTOMER')).toBe(true);
    expect(canAccessCustomer('ADMIN')).toBe(false);
    expect(canAccessCustomer('ORDER_OPERATOR')).toBe(false);
    expect(canAccessCustomer('PRODUCT_MANAGER')).toBe(false);
    expect(canAccessCustomer('COURIER')).toBe(false);
  });
});
