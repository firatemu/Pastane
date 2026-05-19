import { NextResponse } from 'next/server';
import { storefrontApiFetch } from '../../../lib/api/client';
export async function GET(request: Request): Promise<Response> { const url = new URL(request.url); const response = await storefrontApiFetch(`/api/v1/delivery-zones${url.search}`); return new NextResponse(await response.arrayBuffer(), { status: response.status, headers: { 'Content-Type': response.headers.get('content-type') ?? 'application/json' } }); }
