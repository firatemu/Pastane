import type { RoleType } from '@prisma/client';
export interface AuthUser {
  sub: string;
  phone: string;
  role: RoleType;
  permissions: string[];
}
