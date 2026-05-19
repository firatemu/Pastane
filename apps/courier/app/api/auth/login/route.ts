import { NextResponse } from 'next/server';

import { getCourierApiBaseUrl } from '../../../../lib/api/client';
import { courierMessageFromPayload, type ParsedCourierApiPayload } from '../../../../lib/deliveries/courier-api-error';
import { getCookieNames } from '../../../../lib/auth/session';
import type { AuthResponse } from '../../../../lib/auth/types';
import { canAccessCourier } from '../../../../lib/permissions/can';

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as { phone?: string; password?: string };

  let response: Response;
  try {
    response = await fetch(`${getCourierApiBaseUrl()}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ message: 'Bağlantı hatası. Lütfen tekrar deneyin.' }, { status: 503 });
  }

  const payload = (await response.json()) as {
    data?: AuthResponse;
    error?: { message?: string; code?: string };
    message?: string;
  };

  if (!response.ok || !payload.data) {
    const body: ParsedCourierApiPayload = {};
    if (payload.error !== undefined) {
      body.error = payload.error;
    }
    if (typeof payload.message === 'string') {
      body.message = payload.message;
    }
    return NextResponse.json(
      {
        message: courierMessageFromPayload(response.status, body, 'Giriş başarısız.'),
      },
      { status: response.status },
    );
  }

  if (!canAccessCourier(payload.data.user.role)) {
    return NextResponse.json({ message: 'Bu hesap kurye paneline erişemez.' }, { status: 403 });
  }

  const { access, refresh } = getCookieNames();
  const next = NextResponse.json({ user: payload.data.user });
  next.cookies.set(access, payload.data.accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
  next.cookies.set(refresh, payload.data.refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
  return next;
}
