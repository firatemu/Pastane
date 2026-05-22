import Constants from 'expo-constants';
import type { ApiErrorPayload } from '../types';

export function getApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  const fromExtra = Constants.expoConfig?.extra?.apiUrl as string | undefined;
  return (fromEnv ?? fromExtra ?? 'http://localhost:3003').replace(/\/$/, '');
}

export function getWebBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_WEB_URL;
  const fromExtra = Constants.expoConfig?.extra?.webUrl as string | undefined;
  return (fromEnv ?? fromExtra ?? 'http://localhost:3000').replace(/\/$/, '');
}

export function messageFromApi(status: number, payload: ApiErrorPayload, fallback: string): string {
  const msg = payload.error?.message ?? payload.message;
  if (msg) return msg;
  if (status === 401) return 'Oturum süreniz doldu. Lütfen tekrar giriş yapın.';
  if (status >= 500) return 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.';
  return fallback;
}

export function unwrapData<T>(payload: unknown): T {
  const shaped = payload as { data?: T; success?: boolean };
  if (shaped?.data !== undefined) return shaped.data;
  return payload as T;
}

export function unwrapList<T>(payload: unknown): T[] {
  const data = unwrapData<T[] | { items: T[] }>(payload);
  return Array.isArray(data) ? data : data.items ?? [];
}
