import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getWebApiBaseUrl, storefrontApiFetch } from './client';
import { getCookieNames } from '../auth/session';
import { customerFacingMessageFromApi } from '../messages/customer-facing-errors';

export async function proxyCustomerRequest(request: Request, path: string): Promise<Response> {
  const token = (await cookies()).get(getCookieNames().access)?.value;
  if (!token) {
    return NextResponse.json({ success: false, error: { message: 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.', code: 'HTTP_401' } }, { status: 401 });
  }
  const url = new URL(request.url);
  const headers = new Headers();
  headers.set('Authorization', `Bearer ${token}`);
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('Content-Type', contentType);
  const idempotencyKey = request.headers.get('idempotency-key');
  if (idempotencyKey) headers.set('idempotency-key', idempotencyKey);
  const init: RequestInit = { method: request.method, headers, cache: 'no-store' };
  if (!['GET', 'HEAD'].includes(request.method)) init.body = await request.text();
  let response: Response;
  try {
    response = await storefrontApiFetch(`/api/v1/${path}${url.search}`, init);
  } catch (err) {
    const cause = err instanceof Error ? err.message : String(err);
    let message = 'Bağlantı kurulamadı. Lütfen tekrar deneyin.';
    if (process.env.NODE_ENV !== 'production') {
      message += ` (${getWebApiBaseUrl()}: ${cause}). Host ortamında WEB_API_URL=http://api:... kullanmayın; API için API_URL=http://localhost:3003 veya doğru API adresini verin ve API’nin ayakta olduğundan emin olun.`;
    }
    console.error('[proxyCustomerRequest] storefrontApiFetch failed', { path, baseUrl: getWebApiBaseUrl(), cause });
    return NextResponse.json(
      { success: false, error: { message, code: 'HTTP_503' } },
      { status: 503 },
    );
  }
  const ct = response.headers.get('content-type') ?? '';
  if (!ct.includes('application/json')) {
    return new NextResponse(await response.arrayBuffer(), {
      status: response.status,
      headers: { 'Content-Type': ct || 'application/octet-stream' },
    });
  }
  const text = await response.text();
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return new NextResponse(text, { status: response.status, headers: { 'Content-Type': 'application/json' } });
  }
  if (body.success === false && body.error && typeof body.error === 'object' && body.error !== null) {
    const err = body.error as { code?: string; message?: string };
    const message = customerFacingMessageFromApi(response.status, err);
    return NextResponse.json({ ...body, error: { code: err.code, message } }, { status: response.status });
  }
  return NextResponse.json(body, { status: response.status });
}
