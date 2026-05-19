import { proxyCustomerRequest } from '../../../lib/api/customer-proxy';
export async function GET(request: Request): Promise<Response> { return proxyCustomerRequest(request, 'reviews/me'); }
export async function POST(request: Request): Promise<Response> { return proxyCustomerRequest(request, 'reviews'); }
