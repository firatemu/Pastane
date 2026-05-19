import { redirect } from 'next/navigation';
import { canAccessCustomer } from '../permissions/can';
import type { CustomerSession } from './types';

export function requireCustomerRole(session: CustomerSession): void {
  if (!canAccessCustomer(session.user.role.name)) redirect('/access-denied');
}
