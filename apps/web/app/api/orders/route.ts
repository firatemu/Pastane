import { proxyCustomerRequest } from '../../../lib/api/customer-proxy';
export async function POST(request: Request): Promise<Response> { return proxyCustomerRequest(request, 'orders'); }
