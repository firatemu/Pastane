import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { storefrontApiFetch } from '../../../../lib/api/client';
import { getCookieNames } from '../../../../lib/auth/session';

export async function POST(): Promise<Response> {
  const store = await cookies();
  const { access, refresh } = getCookieNames();
  const refreshToken = store.get(refresh)?.value;
  if (refreshToken) {
    await storefrontApiFetch('/api/v1/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
    });
  }
  const response = NextResponse.json({ loggedOut: true });
  response.cookies.delete(access);
  response.cookies.delete(refresh);
  return response;
}
