import { proxyCustomerRequest } from '../../../../lib/api/customer-proxy';
async function proxy(request: Request, context: { params: Promise<{ path: string[] }> }) { const { path } = await context.params; return proxyCustomerRequest(request, `orders/${path.join('/')}`.replace(/\/$/, '')); }
export const GET = proxy; export const POST = proxy;
