import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthState, CartItem, Category, Product } from '../types';

const AUTH_KEY = 'pastahane.auth';

function baseUrl(): string {
  return (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3003').replace(/\/$/, '');
}

function unwrap<T>(payload: unknown): T {
  const shaped = payload as { data?: unknown; items?: unknown };
  if (shaped?.data !== undefined) return shaped.data as T;
  return payload as T;
}

async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = (payload as { error?: { message?: string }; message?: string }).error?.message ?? (payload as { message?: string }).message ?? 'İstek tamamlanamadı.';
    throw new Error(message);
  }
  return unwrap<T>(payload);
}

export async function loadStoredAuth(): Promise<AuthState | null> {
  const raw = await AsyncStorage.getItem(AUTH_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthState;
  } catch {
    await AsyncStorage.removeItem(AUTH_KEY);
    return null;
  }
}

export async function saveStoredAuth(auth: AuthState | null): Promise<void> {
  if (!auth) {
    await AsyncStorage.removeItem(AUTH_KEY);
    return;
  }
  await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(auth));
}

export async function fetchCategories(): Promise<Category[]> {
  const data = await request<Category[] | { items: Category[] }>('/api/v1/categories?page=1&limit=24');
  return Array.isArray(data) ? data : data.items;
}

export async function fetchProducts(categoryId?: string): Promise<Product[]> {
  const query = categoryId ? `&categoryId=${encodeURIComponent(categoryId)}` : '';
  const data = await request<Product[] | { items: Product[] }>(`/api/v1/products?page=1&limit=24${query}`);
  return Array.isArray(data) ? data : data.items;
}

export async function fetchCart(token: string): Promise<CartItem[]> {
  const data = await request<{ items: CartItem[] }>('/api/v1/cart', {}, token);
  return data.items;
}

export async function addCartItem(token: string, productId: string, quantity = 1): Promise<void> {
  await request('/api/v1/cart/items', {
    method: 'POST',
    body: JSON.stringify({ productId, quantity, optionIds: [] }),
  }, token);
}

export async function login(phone: string, password: string): Promise<AuthState> {
  const data = await request<AuthState>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ phone, password }),
  });
  await saveStoredAuth(data);
  return data;
}

export async function register(values: { firstName: string; lastName: string; phone: string; email?: string; password: string }): Promise<AuthState> {
  const data = await request<AuthState>('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify(values),
  });
  await saveStoredAuth(data);
  return data;
}

