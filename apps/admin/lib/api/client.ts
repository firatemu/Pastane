import fs from 'node:fs';
import { adminFacingMessageFromApi } from '../messages/admin-facing-errors';

const DOCKER_INTERNAL_API_HOST = 'api';

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, '');
}

function isDockerRuntime(): boolean {
  if (process.env.RUNNING_IN_DOCKER === '1') return true;
  try {
    return fs.existsSync('/.dockerenv');
  } catch {
    return false;
  }
}

/**
 * Base URL for the admin app's server-side proxy to Nest (`apps/api`).
 * Mirrors storefront logic: `http://api:3003` only resolves inside Docker.
 */
export function getAdminApiBaseUrl(): string {
  const admin = process.env.ADMIN_API_URL?.trim();
  const api = process.env.API_URL?.trim();
  const fallback = 'http://127.0.0.1:3003';
  const inDocker = isDockerRuntime();

  if (!admin) return stripTrailingSlash(api ?? fallback);

  try {
    const { hostname } = new URL(admin);
    if (hostname === DOCKER_INTERNAL_API_HOST && !inDocker) {
      if (api) return stripTrailingSlash(api);
      return stripTrailingSlash(fallback);
    }
  } catch {
    return stripTrailingSlash(admin);
  }

  return stripTrailingSlash(admin);
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${getAdminApiBaseUrl()}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
      cache: 'no-store',
    });
  } catch {
    throw new Error('Nest API bağlantısı kurulamadı.');
  }

  let payload: { success?: boolean; data?: T; error?: { message?: string; code?: string } };
  try {
    const text = await response.text();
    payload = text ? (JSON.parse(text) as typeof payload) : {};
  } catch {
    throw new Error('Nest API beklenmedik bir yanıt döndürdü (JSON değil).');
  }
  if (!response.ok || payload.success === false) {
    throw new Error(adminFacingMessageFromApi(response.status, payload.error, 'İstek tamamlanamadı.'));
  }
  return (payload.data ?? payload) as T;
}
