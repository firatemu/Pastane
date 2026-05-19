import type { AppRole } from '../auth/types';

export function canAccessCustomer(role: AppRole): boolean {
  return role === 'CUSTOMER';
}
