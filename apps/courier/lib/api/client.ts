import fs from 'node:fs';

import { courierFacingMessageFromApi } from '../deliveries/courier-api-error';

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
 * Base URL for the courier app's server-side calls and BFF proxy to Nest.
 * Mirrors admin/web: `http://api:3003` only resolves inside Docker.
 */
export function getCourierApiBaseUrl(): string {
  const courier = process.env.COURIER_API_URL?.trim();
  const api = process.env.API_URL?.trim();
  const fallback = 'http://127.0.0.1:3003';
  const inDocker = isDockerRuntime();

  if (!courier) return stripTrailingSlash(api ?? fallback);

  try {
    const { hostname } = new URL(courier);
    if (hostname === DOCKER_INTERNAL_API_HOST && !inDocker) {
      if (api) return stripTrailingSlash(api);
      return stripTrailingSlash(fallback);
    }
  } catch {
    return stripTrailingSlash(courier);
  }

  return stripTrailingSlash(courier);
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getCourierApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });

  const payload = (await response.json()) as {
    success?: boolean;
    data?: T;
    message?: string;
    error?: { code?: string; message?: string };
  };
  if (!response.ok || payload.success === false) {
    throw new Error(
      courierFacingMessageFromApi(
        response.status,
        payload.error ?? (payload.message ? { message: payload.message } : undefined),
        'Sunucu yanıtı alınamadı.',
      ),
    );
  }
  return (payload.data ?? payload) as T;
}
