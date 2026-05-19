import type { DeliveriesEnvelope, DeliveryDetail, DeliveryListItem } from '../deliveries/types';
import { courierApiUserMessage, redirectToCourierLogin } from '../deliveries/courier-api-error';

type ApiPayload<T> = {
  success?: boolean;
  data?: T;
  message?: string;
  meta?: DeliveriesEnvelope['meta'];
  error?: { code?: string; message?: string };
};

function readPayload<T>(raw: unknown): ApiPayload<T> {
  if (raw && typeof raw === 'object') return raw as ApiPayload<T>;
  return {};
}

async function courierRequestJson<T>(
  path: string,
  init?: RequestInit,
): Promise<{ response: Response; payload: ApiPayload<T> }> {
  const response = await fetch(`/api/deliveries${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });
  let raw: unknown = {};
  try {
    raw = await response.json();
  } catch {
    raw = {};
  }
  return { response, payload: readPayload<T>(raw) };
}

function throwCourierApiFailure(response: Response, payload: ApiPayload<unknown>): never {
  if (response.status === 401) {
    redirectToCourierLogin();
    throw new Error(courierApiUserMessage(401, undefined, undefined));
  }
  const code = payload.error?.code;
  const apiMessage = typeof payload.error?.message === 'string' ? payload.error.message : payload.message;
  const msg = courierApiUserMessage(response.status, code, apiMessage);
  throw new Error(msg);
}

export async function courierFetchEnvelope(path: string): Promise<DeliveriesEnvelope> {
  const { response, payload } = await courierRequestJson<DeliveryListItem[]>(path);
  const failed = !response.ok || payload.success === false;
  if (failed) {
    throwCourierApiFailure(response, payload);
  }
  const data = payload.data;
  const meta = payload.meta;
  if (!Array.isArray(data) || !meta) {
    throw new Error('Teslimatlar beklenen formatta dönmedi.');
  }
  return { data, meta };
}

export async function courierFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { response, payload } = await courierRequestJson<T>(path, init);
  const failed = !response.ok || payload.success === false;
  if (failed) {
    throwCourierApiFailure(response, payload);
  }
  return (payload.data ?? (payload as unknown as T)) as T;
}

export function getDelivery(id: string): Promise<DeliveryDetail> {
  return courierFetch<DeliveryDetail>(`/my/${id}`);
}
