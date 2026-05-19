import { SetMetadata } from '@nestjs/common';
import type { RoleType } from '@prisma/client';
export const ROLES_KEY = 'roles';
export const Roles = (...roles: RoleType[]): ReturnType<typeof SetMetadata> => SetMetadata(ROLES_KEY, roles);
