import { messageFromAdminApiPayload, type ParsedAdminApiPayload } from '../messages/admin-facing-errors';

type CatalogPayload<T = unknown> = ParsedAdminApiPayload & { data?: T; meta?: unknown };

function throwParseError(status: number, ok: boolean): never {
  if (ok) {
    throw new Error('Sunucu yanıtı JSON değil; proxy veya API loglarını kontrol edin.');
  }
  throw new Error(`İstek başarısız (HTTP ${status}).`);
}

export async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/catalog${path}`, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(init?.headers ?? {}),
    },
  });
  const text = await response.text();
  let payload: CatalogPayload<T>;
  try {
    payload = text ? (JSON.parse(text) as CatalogPayload<T>) : ({} as CatalogPayload<T>);
  } catch {
    throwParseError(response.status, response.ok);
  }
  if (!response.ok) {
    throw new Error(messageFromAdminApiPayload(response.status, payload, 'İstek başarısız.'));
  }
  return (payload.data ?? payload) as T;
}

export async function adminFetchEnvelope<T>(path: string): Promise<{ data: T; meta?: unknown }> {
  const response = await fetch(`/api/catalog${path}`);
  const text = await response.text();
  let payload: CatalogPayload<T> & { data: T };
  try {
    payload = text ? (JSON.parse(text) as CatalogPayload<T> & { data: T }) : ({} as CatalogPayload<T> & { data: T });
  } catch {
    throw new Error(`İstek yanıtı işlenemedi (HTTP ${response.status}).`);
  }
  if (!response.ok) {
    throw new Error(messageFromAdminApiPayload(response.status, payload, 'İstek başarısız.'));
  }
  return payload;
}
