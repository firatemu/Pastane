import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { apiFetch, storefrontApiFetch } from '../api/client';
import { canAccessCustomer } from '../permissions/can';
import type { CustomerSession, SessionUser } from './types';

const ACCESS_COOKIE = 'customer_access_token';
const REFRESH_COOKIE = 'customer_refresh_token';

function decodePermissions(token: string): string[] {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8')) as { permissions?: string[] };
    return Array.isArray(payload.permissions) ? payload.permissions : [];
  } catch {
    return [];
  }
}

export async function getCustomerSession(): Promise<CustomerSession | null> {
  const store = await cookies();
  const token = store.get(ACCESS_COOKIE)?.value;
  if (!token) return null;
  try {
    const user = await apiFetch<SessionUser>('/api/v1/users/me', { headers: { Authorization: `Bearer ${token}` } });
    if (!canAccessCustomer(user.role.name)) return null;
    return { user, permissions: decodePermissions(token) };
  } catch {
    return null;
  }
}

export async function requireCustomerSession(): Promise<CustomerSession> {
  const session = await getCustomerSession();
  if (!session) redirect('/giris?neden=oturum');
  return session;
}

export function getCookieNames(): { access: string; refresh: string } {
  return { access: ACCESS_COOKIE, refresh: REFRESH_COOKIE };
}

export async function refreshCustomerSession(refreshToken: string): Promise<{ accessToken: string; refreshToken: string } | null> {
  const response = await storefrontApiFetch('/api/v1/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
    cache: 'no-store',
  });
  if (!response.ok) return null;
  const payload = (await response.json()) as { data?: { accessToken: string; refreshToken: string } };
  return payload.data ?? null;
}
