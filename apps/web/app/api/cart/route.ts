import { proxyCustomerRequest } from '../../../lib/api/customer-proxy';
export async function GET(request: Request): Promise<Response> { return proxyCustomerRequest(request, 'cart'); }
export async function DELETE(request: Request): Promise<Response> { return proxyCustomerRequest(request, 'cart'); }
