import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getAdminApiBaseUrl } from '../../../../lib/api/client';
import { getCookieNames } from '../../../../lib/auth/session';

/** Match multipart uploads case-insensitively (RFC 2045); avoids corrupting binary bodies with `text()`. */
function isMultipartContentType(contentType: string | null): boolean {
  if (!contentType) return false;
  return contentType.toLowerCase().includes('multipart/form-data');
}

async function proxy(request: Request, context: { params: Promise<{ path: string[] }> }): Promise<NextResponse> {
  const { path } = await context.params;
  const token = (await cookies()).get(getCookieNames().access)?.value;
  if (!token) {
    return NextResponse.json({ message: 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.', success: false }, { status: 401 });
  }

  const url = new URL(request.url);
  const target = `${getAdminApiBaseUrl()}/api/v1/${path.join('/')}${url.search}`;

  const headers = new Headers();
  headers.set('Authorization', `Bearer ${token}`);
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('Content-Type', contentType);

  const init: RequestInit = {
    method: request.method,
    headers,
    cache: 'no-store',
  };

  if (!['GET', 'HEAD'].includes(request.method)) {
    init.body = isMultipartContentType(contentType) ? await request.arrayBuffer() : await request.text();
  }

  const response = await fetch(target, init);
  return new NextResponse(await response.arrayBuffer(), {
    status: response.status,
    headers: { 'Content-Type': response.headers.get('content-type') ?? 'application/json' },
  });
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
