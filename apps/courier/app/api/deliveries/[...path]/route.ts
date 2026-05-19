import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { getCourierApiBaseUrl } from '../../../../lib/api/client'
import { getCookieNames } from '../../../../lib/auth/session'

async function proxy(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const store = await cookies()
  const token = store.get(getCookieNames().access)?.value

  if (!token) {
    return NextResponse.json({ message: 'Oturum bulunamadı.' }, { status: 401 })
  }

  const { path } = await params
  const url = new URL(request.url)

  try {
    const method = request.method
    const body = method === 'GET' ? undefined : await request.text()
    const init: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      cache: 'no-store',
      ...(body ? { body } : {}),
    }
    const response = await fetch(
      `${getCourierApiBaseUrl()}/api/v1/deliveries/${path.join('/')}${url.search}`,
      init,
    )
    const payload = await response.text()

    return new Response(payload, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') ?? 'application/json',
      },
    })
  } catch {
    return NextResponse.json({ message: 'Bağlantı hatası. Lütfen tekrar deneyin.' }, { status: 502 })
  }
}

export const GET = proxy
export const PATCH = proxy
