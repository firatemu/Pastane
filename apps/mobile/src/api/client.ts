import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiBaseUrl, messageFromApi, unwrapData, unwrapList } from './config';
import type {
  Address,
  AppNotification,
  AuthState,
  CartItem,
  Category,
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

const AUTH_KEY = 'pastahane.auth';

type RequestOptions = RequestInit & { token?: string; skipAuthRefresh?: boolean };

let refreshPromise: Promise<AuthState | null> | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

async function readAuth(): Promise<AuthState | null> {
  const raw = await AsyncStorage.getItem(AUTH_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthState;
  } catch {
    await AsyncStorage.removeItem(AUTH_KEY);
    return null;
  }
}

export async function loadStoredAuth(): Promise<AuthState | null> {
  return readAuth();
}

export async function saveStoredAuth(auth: AuthState | null): Promise<void> {
  if (!auth) {
    await AsyncStorage.removeItem(AUTH_KEY);
    return;
  }
  await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(auth));
}

async function refreshAuth(refreshToken: string): Promise<AuthState | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch(`${getApiBaseUrl()}/api/v1/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        const payload = await response.json().catch(() => ({}));
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
    response = await fetch(`${getApiBaseUrl()}${path}`, { ...fetchInit, headers });
    payload = await response.json().catch(() => ({}));
  } catch {
    throw new Error(messageFromApi(0, {}, 'Sunucuya bağlanılamadı.'));
  }

  if (response.status === 401 && token && !skipAuthRefresh) {
    const stored = await readAuth();
    if (stored?.refreshToken) {
      const refreshed = await refreshAuth(stored.refreshToken);
      if (refreshed) {
        headers.Authorization = `Bearer ${refreshed.accessToken}`;
        try {
          response = await fetch(`${getApiBaseUrl()}${path}`, { ...fetchInit, headers });
          payload = await response.json().catch(() => ({}));
        } catch {
          throw new Error(messageFromApi(0, {}, 'Sunucuya bağlanılamadı.'));
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

export async function fetchProducts(params: { categoryId?: string; page?: number; limit?: number } = {}): Promise<Product[]> {
  const search = new URLSearchParams({ page: String(params.page ?? 1), limit: String(params.limit ?? 50) });
  if (params.categoryId) search.set('categoryId', params.categoryId);
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

export async function createAddress(body: Omit<Address, 'id'>): Promise<Address> {
  return authedRequest<Address>('/api/v1/addresses', { method: 'POST', body: JSON.stringify(body) });
}

export async function updateAddress(id: string, body: Partial<Address>): Promise<Address> {
  return authedRequest<Address>(`/api/v1/addresses/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export async function deleteAddress(id: string): Promise<void> {
  await authedRequest(`/api/v1/addresses/${id}`, { method: 'DELETE' });
}

export async function setDefaultAddress(id: string): Promise<Address> {
  return authedRequest<Address>(`/api/v1/addresses/${id}/default`, { method: 'PATCH' });
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
}): Promise<Order> {
  return authedRequest<Order>('/api/v1/orders', { method: 'POST', body: JSON.stringify(body) });
}

export async function fetchOrders(): Promise<Order[]> {
  return authedRequest<Order[]>('/api/v1/orders/my');
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

export async function initiateDevCardPayment(orderId: string): Promise<Payment> {
  return authedRequest<Payment>('/api/v1/payments/initiate', {
    method: 'POST',
    headers: { 'idempotency-key': `${orderId}:mobile-dev` },
    body: JSON.stringify({
      orderId,
      cardHolderName: 'Demo Müşteri',
      cardNumber: '5528790000000008',
      expireMonth: '12',
      expireYear: '30',
      cvc: '123',
    }),
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

export { readAuth as getStoredAuth };
