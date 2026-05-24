import AsyncStorage from '@react-native-async-storage/async-storage';
import { SECURE_STORE_ACCESS_TOKEN_KEY, SECURE_STORE_REFRESH_TOKEN_KEY } from '@pastane/constants';
import { messageForCode } from '@pastane/tr-api-errors';
import { getApiBaseUrl, messageFromApi, unwrapData, unwrapList } from './config';
import type {
  Address,
  AppNotification,
  AuthState,
  Campaign,
  CartItem,
  Category,
  DeliveryZone,
  HomeBanner,
  LoyaltyAccount,
  LoyaltyMovement,
  Order,
  Payment,
  Product,
  Review,
  Store,
  User,
} from '../types';
import { deleteAuthTokenSecure, getAuthTokenSecure, setAuthTokenSecure } from '@/utils/auth-token-storage';

const NETWORK_ERROR_CODE = 'NETWORK_ERROR';
const REQUEST_TIMEOUT_MS = 10_000;
const FETCH_MAX_ATTEMPTS = 3;
const LEGACY_AUTH_KEY = 'pastahane.auth';
const RESPONSE_NOT_JSON_MESSAGE_TR = 'Sunucudan beklenen yanıt alınamadı.';

function parseApiJsonStrict(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) return {};
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    throw new Error(RESPONSE_NOT_JSON_MESSAGE_TR);
  }
}

function parseApiJsonLenient(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) return {};
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return {};
  }
}

type RequestOptions = RequestInit & { token?: string; skipAuthRefresh?: boolean };

let legacyMigrated = false;
let refreshPromise: Promise<AuthState | null> | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function networkFailureMessage(): string {
  return messageForCode(NETWORK_ERROR_CODE, 'customer') ?? 'Bağlantı kullanılamıyor. Lütfen tekrar deneyin.';
}

async function resilientFetch(url: string, init: RequestInit): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= FETCH_MAX_ATTEMPTS; attempt += 1) {
    const ctrl = new AbortController();
    const timeoutId = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, { ...init, signal: ctrl.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (caught) {
      clearTimeout(timeoutId);
      lastError = caught;
      const aborted =
        caught instanceof DOMException
          ? caught.name === 'AbortError'
          : typeof caught === 'object' &&
            caught !== null &&
            'name' in caught &&
            String((caught as { name?: string }).name) === 'AbortError';
      const maybeNetwork = caught instanceof TypeError || aborted;
      if (attempt < FETCH_MAX_ATTEMPTS && maybeNetwork) {
        await sleep(100 * 2 ** (attempt - 1));
        continue;
      }
      break;
    }
  }
  void lastError;
  throw new Error(networkFailureMessage());
}

async function clearSecureAuth(): Promise<void> {
  await Promise.all([
    deleteAuthTokenSecure(SECURE_STORE_ACCESS_TOKEN_KEY),
    deleteAuthTokenSecure(SECURE_STORE_REFRESH_TOKEN_KEY),
  ]);
  await AsyncStorage.removeItem(LEGACY_AUTH_KEY).catch(() => undefined);
}

async function migrateLegacyAuthOnce(): Promise<void> {
  if (legacyMigrated) return;
  legacyMigrated = true;
  const raw = await AsyncStorage.getItem(LEGACY_AUTH_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as Partial<AuthState>;
    const access = typeof parsed.accessToken === 'string' ? parsed.accessToken.trim() : '';
    const refresh = typeof parsed.refreshToken === 'string' ? parsed.refreshToken.trim() : '';
    if (!access || !refresh) {
      await AsyncStorage.removeItem(LEGACY_AUTH_KEY);
      return;
    }
    await setAuthTokenSecure(SECURE_STORE_ACCESS_TOKEN_KEY, access);
    await setAuthTokenSecure(SECURE_STORE_REFRESH_TOKEN_KEY, refresh);
    await AsyncStorage.removeItem(LEGACY_AUTH_KEY);
  } catch {
    await AsyncStorage.removeItem(LEGACY_AUTH_KEY).catch(() => undefined);
    await clearSecureAuth();
  }
}

async function readAuth(): Promise<AuthState | null> {
  await migrateLegacyAuthOnce();
  const accessRaw = await getAuthTokenSecure(SECURE_STORE_ACCESS_TOKEN_KEY);
  const refreshRaw = await getAuthTokenSecure(SECURE_STORE_REFRESH_TOKEN_KEY);
  const accessToken = accessRaw?.trim() ?? '';
  const refreshToken = refreshRaw?.trim() ?? '';
  if (!accessToken || !refreshToken) {
    await clearSecureAuth();
    return null;
  }
  return { accessToken, refreshToken };
}

export async function loadStoredAuth(): Promise<AuthState | null> {
  return readAuth();
}

export async function saveStoredAuth(auth: AuthState | null): Promise<void> {
  if (!auth) {
    await clearSecureAuth();
    return;
  }
  await setAuthTokenSecure(SECURE_STORE_ACCESS_TOKEN_KEY, auth.accessToken.trim());
  await setAuthTokenSecure(SECURE_STORE_REFRESH_TOKEN_KEY, auth.refreshToken.trim());
}

async function refreshAuth(refreshToken: string): Promise<AuthState | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const url = `${getApiBaseUrl()}/api/v1/auth/refresh`;
        const response = await resilientFetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        const payload = parseApiJsonLenient(await response.text());
        if (!response.ok) return null;
        const data = unwrapData<AuthState>(payload);
        await saveStoredAuth(data);
        return data;
      } catch {
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

async function request<T>(path: string, init: RequestOptions = {}): Promise<T> {
  const { token, skipAuthRefresh, ...fetchInit } = init;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(fetchInit.headers as Record<string, string> | undefined),
  };

  let response: Response;
  let payload: unknown;
  try {
    const url = `${getApiBaseUrl()}${path}`;
    response = await resilientFetch(url, { ...fetchInit, headers });
    payload = parseApiJsonStrict(await response.text());
  } catch (caught) {
    if (caught instanceof Error && caught.message === RESPONSE_NOT_JSON_MESSAGE_TR) {
      throw caught;
    }
    throw new Error(networkFailureMessage());
  }

  if (response.status === 401 && token && !skipAuthRefresh) {
    const stored = await readAuth();
    if (stored?.refreshToken) {
      const refreshed = await refreshAuth(stored.refreshToken);
      if (refreshed) {
        headers.Authorization = `Bearer ${refreshed.accessToken}`;
        try {
          response = await resilientFetch(`${getApiBaseUrl()}${path}`, { ...fetchInit, headers });
          payload = parseApiJsonStrict(await response.text());
        } catch (caught) {
          if (caught instanceof Error && caught.message === RESPONSE_NOT_JSON_MESSAGE_TR) {
            throw caught;
          }
          throw new Error(networkFailureMessage());
        }
      }
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      await saveStoredAuth(null);
      unauthorizedHandler?.();
    }
    throw new Error(messageFromApi(response.status, payload as Parameters<typeof messageFromApi>[1], 'İstek tamamlanamadı.'));
  }
  return unwrapData<T>(payload);
}

async function authedRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const auth = await readAuth();
  if (!auth?.accessToken) throw new Error('Giriş yapmanız gerekiyor.');
  return request<T>(path, { ...init, token: auth.accessToken });
}

export async function login(phone: string, password: string): Promise<AuthState> {
  const data = await request<AuthState>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ phone, password }),
    skipAuthRefresh: true,
  });
  await saveStoredAuth(data);
  return data;
}

export async function register(values: {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  password: string;
}): Promise<AuthState> {
  const data = await request<AuthState>('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify(values),
    skipAuthRefresh: true,
  });
  await saveStoredAuth(data);
  return data;
}

export async function logout(): Promise<void> {
  const auth = await readAuth();
  if (auth?.refreshToken) {
    try {
      await request('/api/v1/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: auth.refreshToken }),
        token: auth.accessToken,
        skipAuthRefresh: true,
      });
    } catch {
      /* clear local session anyway */
    }
  }
  await saveStoredAuth(null);
}

export async function fetchCategories(): Promise<Category[]> {
  return unwrapList<Category>(await request('/api/v1/categories?page=1&limit=50'));
}

export async function fetchProducts(params: { categoryId?: string; page?: number; limit?: number; search?: string } = {}): Promise<Product[]> {
  const search = new URLSearchParams({ page: String(params.page ?? 1), limit: String(params.limit ?? 50) });
  if (params.categoryId) search.set('categoryId', params.categoryId);
  if (params.search) search.set('search', params.search);
  return unwrapList<Product>(await request(`/api/v1/products?${search.toString()}`));
}

export async function fetchProductBySlug(slug: string): Promise<Product> {
  return request<Product>(`/api/v1/products/slug/${encodeURIComponent(slug)}`);
}

export async function fetchHomeBanners(): Promise<HomeBanner[]> {
  try {
    return unwrapList<HomeBanner>(await request('/api/v1/banners/home'));
  } catch {
    return [];
  }
}

export async function fetchCart(): Promise<CartItem[]> {
  const data = await authedRequest<{ items: CartItem[] }>('/api/v1/cart');
  return data.items ?? [];
}

export async function validateCartForCheckout(): Promise<CartItem[]> {
  const data = await authedRequest<{ items: CartItem[] }>('/api/v1/cart/validate-checkout', { method: 'POST' });
  return data.items ?? [];
}

export async function addCartItem(productId: string, quantity = 1, optionIds: string[] = [], customNote?: string): Promise<void> {
  await authedRequest('/api/v1/cart/items', {
    method: 'POST',
    body: JSON.stringify({ productId, quantity, optionIds, customNote }),
  });
}

export async function updateCartItem(id: string, quantity: number): Promise<void> {
  await authedRequest(`/api/v1/cart/items/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ quantity }),
  });
}

export async function removeCartItem(id: string): Promise<void> {
  await authedRequest(`/api/v1/cart/items/${id}`, { method: 'DELETE' });
}

export async function fetchAddresses(): Promise<Address[]> {
  return authedRequest<Address[]>('/api/v1/addresses');
}

const ADDRESS_WRITE_KEYS = [
  'title',
  'city',
  'district',
  'neighborhood',
  'fullAddress',
  'building',
  'floor',
  'apartment',
  'directions',
  'mapAddress',
  'latitude',
  'longitude',
  'isDefault',
] as const;

/** PATCH gövdesinde yalnızca DTO alanları; `id` veya API'nin döndürdüğü ek alanlar `forbidNonWhitelisted` ile 400 üretmesin diye çıkarılır. */
function pickAddressWriteBody(body: Partial<Address> & Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of ADDRESS_WRITE_KEYS) {
    const v = body[key];
    if (v !== undefined) out[key] = v;
  }
  return out;
}

export async function createAddress(body: Omit<Address, 'id'>): Promise<Address> {
  return authedRequest<Address>('/api/v1/addresses', {
    method: 'POST',
    body: JSON.stringify(pickAddressWriteBody(body as Partial<Address> & Record<string, unknown>)),
  });
}

export async function updateAddress(id: string, body: Partial<Address>): Promise<Address> {
  return authedRequest<Address>(`/api/v1/addresses/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(pickAddressWriteBody(body as Partial<Address> & Record<string, unknown>)),
  });
}

export async function deleteAddress(id: string): Promise<void> {
  await authedRequest(`/api/v1/addresses/${id}`, { method: 'DELETE' });
}

export async function setDefaultAddress(id: string): Promise<Address> {
  return authedRequest<Address>(`/api/v1/addresses/${id}/default`, {
    method: 'PATCH',
    body: '{}',
  });
}

export async function fetchStores(): Promise<Store[]> {
  const data = await request<Store[] | { items: Store[] }>('/api/v1/stores?page=1&limit=20');
  return unwrapList<Store>(data);
}

export async function createOrder(body: {
  deliveryType: 'HOME_DELIVERY' | 'PICKUP';
  addressId?: string;
  pickupStoreId?: string;
  note?: string;
  scheduledAt?: string;
}): Promise<Order> {
  const payload: Record<string, unknown> = { deliveryType: body.deliveryType };
  if (body.deliveryType === 'HOME_DELIVERY' && body.addressId) payload.addressId = body.addressId;
  if (body.deliveryType === 'PICKUP' && body.pickupStoreId) payload.pickupStoreId = body.pickupStoreId;
  if (body.note?.trim()) payload.note = body.note.trim();
  if (body.scheduledAt) payload.scheduledAt = body.scheduledAt;
  return authedRequest<Order>('/api/v1/orders', { method: 'POST', body: JSON.stringify(payload) });
}

export async function fetchOrders(params?: { tarih?: string }): Promise<Order[]> {
  const qs = params?.tarih ? `?tarih=${encodeURIComponent(params.tarih)}` : '';
  return authedRequest<Order[]>(`/api/v1/orders/my${qs}`);
}

export async function fetchOrder(id: string): Promise<Order> {
  return authedRequest<Order>(`/api/v1/orders/${id}`);
}

export async function cancelOrder(id: string): Promise<Order> {
  return authedRequest<Order>(`/api/v1/orders/${id}/cancel`, { method: 'POST' });
}

export async function initCheckoutForm(orderId: string): Promise<{ checkoutFormContent: string }> {
  return authedRequest<{ checkoutFormContent: string }>('/api/v1/payments/checkout-form-init', {
    method: 'POST',
    headers: { 'idempotency-key': `${orderId}:iyzico-mobile` },
    body: JSON.stringify({ orderId }),
  });
}

export async function fetchPayments(orderId: string): Promise<Payment[]> {
  const data = await authedRequest<Payment[] | Payment>(`/api/v1/payments/${orderId}`);
  return Array.isArray(data) ? data : [data];
}

export async function fetchMe(): Promise<User> {
  return authedRequest<User>('/api/v1/users/me');
}

export async function updateMe(body: Pick<User, 'firstName' | 'lastName'> & { email?: string | null }): Promise<User> {
  return authedRequest<User>('/api/v1/users/me', { method: 'PATCH', body: JSON.stringify(body) });
}

export async function changePassword(body: { currentPassword: string; newPassword: string }): Promise<{ changed: true }> {
  return authedRequest<{ changed: true }>('/api/v1/users/me/password', { method: 'PATCH', body: JSON.stringify(body) });
}

export async function fetchActiveCampaigns(): Promise<Campaign[]> {
  try {
    return unwrapList<Campaign>(await request('/api/v1/campaigns/active'));
  } catch {
    return [];
  }
}

export async function fetchDeliveryZones(): Promise<DeliveryZone[]> {
  try {
    const data = await request<{ items: DeliveryZone[] }>('/api/v1/delivery-zones?page=1&limit=10');
    return data.items ?? unwrapList<DeliveryZone>(data);
  } catch {
    return [];
  }
}

export async function fetchProductReviews(productId: string): Promise<Review[]> {
  const data = await request<{ items: Review[] }>(`/api/v1/reviews/product/${productId}?page=1&limit=20`);
  return data.items ?? [];
}

export async function createReview(body: { productId: string; orderItemId: string; rating: number; comment?: string }): Promise<Review> {
  return authedRequest<Review>('/api/v1/reviews', { method: 'POST', body: JSON.stringify(body) });
}

export async function fetchMyReviews(): Promise<Review[]> {
  return authedRequest<Review[]>('/api/v1/reviews/me');
}

export async function fetchLoyalty(): Promise<LoyaltyAccount | null> {
  try {
    return await authedRequest<LoyaltyAccount>('/api/v1/loyalty/me');
  } catch {
    return null;
  }
}

export async function fetchLoyaltyMovements(): Promise<LoyaltyMovement[]> {
  return authedRequest<LoyaltyMovement[]>('/api/v1/loyalty/me/movements');
}

export async function fetchNotifications(): Promise<AppNotification[]> {
  return authedRequest<AppNotification[]>('/api/v1/notifications/me');
}

export async function markNotificationRead(id: string): Promise<AppNotification> {
  return authedRequest<AppNotification>(`/api/v1/notifications/me/${id}/read`, { method: 'PATCH' });
}

export async function markAllNotificationsRead(): Promise<{ updated: number }> {
  return authedRequest<{ updated: number }>('/api/v1/notifications/me/read-all', { method: 'PATCH' });
}

export { readAuth as getStoredAuth };
