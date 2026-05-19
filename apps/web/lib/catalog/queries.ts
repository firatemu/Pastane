import { notFound } from 'next/navigation';
import { apiFetch, getWebApiBaseUrl, storefrontApiFetch } from '../api/client';
import { messageFromCustomerApiPayload, type ParsedCustomerApiPayload } from '../messages/customer-facing-errors';
import type { Campaign, Category, HomeBanner, PaginatedDeliveryZones, PaginatedProducts, PaginatedReviews, PaginatedStores, Product } from './types';

export async function getCategories(): Promise<Category[]> {
  return apiFetch<Category[]>('/api/v1/categories');
}

export async function getCategoryBySlug(slug: string): Promise<Category> {
  try {
    return await apiFetch<Category>(`/api/v1/categories/slug/${slug}`);
  } catch {
    notFound();
  }
}

export async function getProducts(params: Record<string, string | number | undefined> = {}): Promise<PaginatedProducts> {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined) search.set(key, String(value));
  const response = await storefrontApiFetch(`/api/v1/products${search.size ? `?${search.toString()}` : ''}`);
  const payload = (await response.json()) as ParsedCustomerApiPayload & { data?: Product[]; meta?: PaginatedProducts['meta'] };
  if (!response.ok || payload.success === false || !payload.data || !payload.meta) {
    throw new Error(messageFromCustomerApiPayload(response.status, payload, 'Ürün listesi yüklenemedi. Lütfen tekrar deneyin.'));
  }
  return { items: payload.data, meta: payload.meta };
}

export async function getProductBySlug(slug: string): Promise<Product> {
  try {
    return await apiFetch<Product>(`/api/v1/products/slug/${slug}`);
  } catch {
    notFound();
  }
}

export async function getProductReviews(productId: string): Promise<PaginatedReviews> {
  const response = await storefrontApiFetch(`/api/v1/reviews/product/${productId}?page=1&limit=6`);
  const payload = (await response.json()) as ParsedCustomerApiPayload & { data?: PaginatedReviews['items']; meta?: PaginatedReviews['meta'] };
  if (!response.ok || payload.success === false || !payload.data || !payload.meta) {
    throw new Error(messageFromCustomerApiPayload(response.status, payload, 'Yorumlar yüklenemedi. Lütfen tekrar deneyin.'));
  }
  return { items: payload.data, meta: payload.meta };
}

export async function getHomeBanners(): Promise<HomeBanner[]> {
  try {
    return await apiFetch<HomeBanner[]>('/api/v1/banners/home');
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      const message = err instanceof Error ? err.message : String(err);
      console.warn('[getHomeBanners] home banners request failed; falling back to static hero', {
        baseUrl: getWebApiBaseUrl(),
        message,
      });
    }
    return [];
  }
}


export async function getActiveCampaigns(): Promise<Campaign[]> {
  try {
    return await apiFetch<Campaign[]>('/api/v1/campaigns/active');
  } catch {
    return [];
  }
}

export async function getStores(params: Record<string, string | number | undefined> = { page: 1, limit: 3 }): Promise<PaginatedStores> {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined) search.set(key, String(value));
  const response = await storefrontApiFetch(`/api/v1/stores${search.size ? `?${search.toString()}` : ''}`);
  const payload = (await response.json()) as ParsedCustomerApiPayload & { data?: PaginatedStores['items']; meta?: PaginatedStores['meta'] };
  if (!response.ok || payload.success === false || !payload.data || !payload.meta) {
    throw new Error(messageFromCustomerApiPayload(response.status, payload, 'Mağazalar yüklenemedi. Lütfen tekrar deneyin.'));
  }
  return { items: payload.data, meta: payload.meta };
}

export async function getDeliveryZones(params: Record<string, string | number | undefined> = { page: 1, limit: 3 }): Promise<PaginatedDeliveryZones> {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined) search.set(key, String(value));
  const response = await storefrontApiFetch(`/api/v1/delivery-zones${search.size ? `?${search.toString()}` : ''}`);
  const payload = (await response.json()) as ParsedCustomerApiPayload & { data?: PaginatedDeliveryZones['items']; meta?: PaginatedDeliveryZones['meta'] };
  if (!response.ok || payload.success === false || !payload.data || !payload.meta) {
    throw new Error(messageFromCustomerApiPayload(response.status, payload, 'Teslimat bölgeleri yüklenemedi. Lütfen tekrar deneyin.'));
  }
  return { items: payload.data, meta: payload.meta };
}
