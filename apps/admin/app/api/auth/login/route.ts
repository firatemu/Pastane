import { NextResponse } from 'next/server';
import { getAdminApiBaseUrl } from '../../../../lib/api/client';
import { canAccessAdmin } from '../../../../lib/permissions/can';
import { getCookieNames } from '../../../../lib/auth/session';
import type { AuthResponse } from '../../../../lib/auth/types';
import { adminFacingMessageFromApi } from '../../../../lib/messages/admin-facing-errors';

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as { phone?: string; password?: string };
  let response: Response;
  try {
    response = await fetch(`${getAdminApiBaseUrl()}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ message: 'Bağlantı kurulamadı. Lütfen tekrar deneyin.' }, { status: 503 });
  }
  const payload = (await response.json()) as { data?: AuthResponse; error?: { message?: string; code?: string } };

  if (!response.ok || !payload.data) {
    return NextResponse.json(
      { message: adminFacingMessageFromApi(response.status, payload.error, 'Giriş başarısız.') },
      { status: response.status },
    );
  }
  if (!canAccessAdmin(payload.data.user.role)) {
    return NextResponse.json({ message: 'Bu hesap admin paneline erişemez.' }, { status: 403 });
  }

  const { access, refresh } = getCookieNames();
  const nextResponse = NextResponse.json({ user: payload.data.user });
  nextResponse.cookies.set(access, payload.data.accessToken, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' });
  nextResponse.cookies.set(refresh, payload.data.refreshToken, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' });
  return nextResponse;
}
