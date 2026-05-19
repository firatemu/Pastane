import { ADMIN_APP_ROLES } from './constants';
import type { AdminRole } from '../auth/types';

export function can(permissions: readonly string[], required: readonly string[]): boolean {
  if (required.length === 0) return true;
  return required.some((permission) => permissions.includes(permission));
}

export function canAccessAdmin(role: AdminRole): boolean {
  return ADMIN_APP_ROLES.includes(role);
}
