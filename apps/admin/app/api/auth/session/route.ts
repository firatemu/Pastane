import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { apiFetch } from '../../../../lib/api/client';
import { canAccessAdmin } from '../../../../lib/permissions/can';
import { getCookieNames, refreshAdminSession } from '../../../../lib/auth/session';
import type { SessionUser } from '../../../../lib/auth/types';

export async function GET(): Promise<Response> {
  const cookieStore = await cookies();
  const { access, refresh } = getCookieNames();
  let accessToken = cookieStore.get(access)?.value;
  const refreshToken = cookieStore.get(refresh)?.value;

  if (!accessToken && refreshToken) {
    const refreshed = await refreshAdminSession(refreshToken);
    if (refreshed) accessToken = refreshed.accessToken;
  }
  if (!accessToken) return NextResponse.json({ authenticated: false }, { status: 401 });

  try {
    const user = await apiFetch<SessionUser>('/api/v1/users/me', { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!canAccessAdmin(user.role.name)) return NextResponse.json({ authenticated: false }, { status: 403 });
    return NextResponse.json({ authenticated: true, user });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
