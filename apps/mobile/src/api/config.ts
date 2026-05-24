import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { ApiErrorPayload } from '../types';

/** Android emülatör host makineye `10.0.2.2` ile ulaşır; iOS simülatör ve genelde `localhost` kullanır. Fiziksel cihaz için `EXPO_PUBLIC_API_URL` / `EXPO_PUBLIC_WEB_URL` ayarlayın. */
function defaultDevApiUrl(): string {
  return Platform.OS === 'android' ? 'http://10.0.2.2:3003' : 'http://localhost:3003';
}

function defaultDevWebUrl(): string {
  return Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
}

export function getApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  const fromExtra = Constants.expoConfig?.extra?.apiUrl as string | undefined;
  return (fromEnv ?? fromExtra ?? (__DEV__ ? defaultDevApiUrl() : 'https://api.azem.cloud')).replace(/\/$/, '');
}

export function getWebBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_WEB_URL;
  const fromExtra = Constants.expoConfig?.extra?.webUrl as string | undefined;
  return (fromEnv ?? fromExtra ?? (__DEV__ ? defaultDevWebUrl() : 'https://azem.cloud')).replace(/\/$/, '');
}

export function messageFromApi(status: number, payload: ApiErrorPayload, fallback: string): string {
  const msg = payload.error?.message ?? payload.message;
  if (status === 401) return 'Oturum süreniz doldu. Lütfen tekrar giriş yapın.';
  if (status === 0) return 'Sunucuya bağlanılamadı. İnternet bağlantınızı ve API adresini kontrol edin.';
  if (msg) return translateApiMessage(msg);
  if (status >= 500) return 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.';
  return fallback;
}

function translateApiMessage(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes('invalid credentials')) return 'Telefon veya şifre hatalı.';
  if (normalized.includes('user already exists')) return 'Bu telefon veya e-posta ile kayıtlı kullanıcı var.';
  if (normalized.includes('required option')) return 'Zorunlu ürün seçimini tamamlayın.';
  if (normalized.includes('unavailable cart items removed')) return 'Satışa kapalı ürünler sepetinizden çıkarıldı.';
  if (normalized.includes('product not active') || normalized.includes('not available for sale')) return 'Ürün şu anda satışa açık değil.';
  if (normalized.includes('cart item not found')) return 'Sepetteki ürün bulunamadı.';
  if (normalized.includes('order not payable')) return 'Sipariş ödeme için uygun değil.';
  if (normalized.includes('order not found')) return 'Sipariş bulunamadı.';
  if (normalized.includes('address not found')) return 'Adres bulunamadı.';
  if (normalized.includes('iyzico')) return message;
  return message;
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
