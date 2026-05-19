import { NextResponse } from 'next/server';
import { storefrontApiFetch } from '../../../../lib/api/client';
import { getCookieNames } from '../../../../lib/auth/session';
import type { AuthResponse } from '../../../../lib/auth/types';
import { customerFacingMessageFromApi } from '../../../../lib/messages/customer-facing-errors';
import { canAccessCustomer } from '../../../../lib/permissions/can';

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as { firstName?: string; lastName?: string; phone?: string; email?: string; password?: string };
  let response: Response;
  try {
    response = await storefrontApiFetch('/api/v1/auth/register', {
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
      { message: customerFacingMessageFromApi(response.status, payload.error, 'Kayıt başarısız.') },
      { status: response.status },
    );
  }
  if (!canAccessCustomer(payload.data.user.role)) return NextResponse.json({ message: 'Bu hesap müşteri alanına erişemez.' }, { status: 403 });

  const { access, refresh } = getCookieNames();
  const next = NextResponse.json({ user: payload.data.user });
  next.cookies.set(access, payload.data.accessToken, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' });
  next.cookies.set(refresh, payload.data.refreshToken, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' });
  return next;
}
