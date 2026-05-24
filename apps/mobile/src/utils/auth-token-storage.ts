/**
 * expo-secure-store web stub'ında native API yok (`getValueWithKeyAsync` tanımsız).
 * `isAvailableAsync()` false ise veya güvenli depolama hata verirse tokenları AsyncStorage'da saklarız (web için kabul edilebilir güvenlik).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const FALLBACK_PREFIX = '@pastane/auth_token_fallback:';

let preferSecureLoad: Promise<boolean> | null = null;

async function prefersSecureStorage(): Promise<boolean> {
  preferSecureLoad ??= SecureStore.isAvailableAsync().catch(() => false);
  return preferSecureLoad;
}

async function fallbackGet(key: string): Promise<string | null> {
  return AsyncStorage.getItem(FALLBACK_PREFIX + key);
}

export async function getAuthTokenSecure(key: string): Promise<string | null> {
  let stored: string | null = null;
  if (await prefersSecureStorage()) {
    try {
      stored = await SecureStore.getItemAsync(key);
    } catch {
      stored = null;
    }
  }
  const trimmed = stored?.trim();
  if (trimmed) return trimmed;
  return (await fallbackGet(key))?.trim() ?? null;
}

export async function setAuthTokenSecure(key: string, value: string): Promise<void> {
  if (await prefersSecureStorage()) {
    try {
      await SecureStore.setItemAsync(key, value);
      await AsyncStorage.removeItem(FALLBACK_PREFIX + key).catch(() => undefined);
      return;
    } catch {
      /* aşağıdaki fallback */
    }
  }
  await AsyncStorage.setItem(FALLBACK_PREFIX + key, value);
}

export async function deleteAuthTokenSecure(key: string): Promise<void> {
  if (await prefersSecureStorage()) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      /* yine de fallback temizle */
    }
  }
  await AsyncStorage.removeItem(FALLBACK_PREFIX + key).catch(() => undefined);
}
