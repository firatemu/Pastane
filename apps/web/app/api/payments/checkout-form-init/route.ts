import { proxyCustomerRequest } from '../../../../lib/api/customer-proxy';

/** Ayrı rota; `[...path]` ile eşleşme sorunu veya CDN/proxy uyumu için garanti endpoint. */
export async function POST(request: Request): Promise<Response> {
  return proxyCustomerRequest(request, 'payments/checkout-form-init');
}
