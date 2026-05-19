import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { apiFetch, getAdminApiBaseUrl } from '../api/client';
import { canAccessAdmin } from '../permissions/can';
import type { AdminSession, SessionUser } from './types';

const ACCESS_COOKIE = 'admin_access_token';
const REFRESH_COOKIE = 'admin_refresh_token';

function decodePermissions(token: string): string[] {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8')) as { permissions?: string[] };
    return Array.isArray(payload.permissions) ? payload.permissions : [];
  } catch {
    return [];
  }
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE)?.value;
  if (!accessToken) return null;

  try {
    const user = await apiFetch<SessionUser>('/api/v1/users/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!canAccessAdmin(user.role.name)) return null;
    return { user, permissions: decodePermissions(accessToken) };
  } catch {
    return null;
  }
}

export async function requireAdminSession(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect('/login');
  return session;
}

export function getCookieNames(): { access: string; refresh: string } {
  return { access: ACCESS_COOKIE, refresh: REFRESH_COOKIE };
}

export async function refreshAdminSession(refreshToken: string): Promise<{ accessToken: string; refreshToken: string } | null> {
  const response = await fetch(`${getAdminApiBaseUrl()}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
    cache: 'no-store',
  });
  if (!response.ok) return null;
  const payload = (await response.json()) as { data?: { accessToken: string; refreshToken: string } };
  return payload.data ?? null;
}
