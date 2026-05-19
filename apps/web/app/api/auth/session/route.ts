import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { apiFetch } from '../../../../lib/api/client';
import { getCookieNames, refreshCustomerSession } from '../../../../lib/auth/session';
import type { SessionUser } from '../../../../lib/auth/types';
import { canAccessCustomer } from '../../../../lib/permissions/can';

export async function GET(): Promise<Response> {
  const store = await cookies();
  const { access, refresh } = getCookieNames();
  let token = store.get(access)?.value;
  const refreshToken = store.get(refresh)?.value;
  if (!token && refreshToken) {
    const refreshed = await refreshCustomerSession(refreshToken);
    if (refreshed) token = refreshed.accessToken;
  }
  if (!token) return NextResponse.json({ authenticated: false }, { status: 401 });
  try {
    const user = await apiFetch<SessionUser>('/api/v1/users/me', { headers: { Authorization: `Bearer ${token}` } });
    if (!canAccessCustomer(user.role.name)) return NextResponse.json({ authenticated: false }, { status: 403 });
    return NextResponse.json({ authenticated: true, user });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
