import fs from 'node:fs';
import { customerFacingMessageFromApi } from '../messages/customer-facing-errors';

const DOCKER_INTERNAL_API_HOST = 'api';

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, '');
}

/** True when this Node process runs inside a Linux container (Compose / K8s, etc.). */
function isDockerRuntime(): boolean {
  if (process.env.RUNNING_IN_DOCKER === '1') return true;
  try {
    return fs.existsSync('/.dockerenv');
  } catch {
    return false;
  }
}

/**
 * Base URL for server-side calls from the storefront to Nest (`apps/api`).
 *
 * - In Docker Compose, use `WEB_API_URL=http://api:3003` (hostname `api` resolves only inside the stack).
 * - `/.dockerenv` (or `RUNNING_IN_DOCKER=1`) means we must **not** replace that URL with `API_URL`, which
 *   often points at `http://localhost:3003` for the host and would be wrong inside the web container.
 * - On the developer host (`pnpm dev`), a stray `WEB_API_URL=http://api:3003` in `.env` has no DNS for `api`
 *   → we fall back to `API_URL` or `http://localhost:3003`.
 */
export function getWebApiBaseUrl(): string {
  const web = process.env.WEB_API_URL?.trim();
  const api = process.env.API_URL?.trim();
  const fallback = 'http://localhost:3003';
  const inDocker = isDockerRuntime();

  if (!web) return stripTrailingSlash(api ?? fallback);

  try {
    const { hostname } = new URL(web);
    if (hostname === DOCKER_INTERNAL_API_HOST && !inDocker) {
      if (api) return stripTrailingSlash(api);
      return stripTrailingSlash(fallback);
    }
  } catch {
    return stripTrailingSlash(web);
  }

  return stripTrailingSlash(web);
}

function reachabilityHint(): string {
  return (
    'Start the Nest API on that port (e.g. pnpm --filter @pastane/api dev), restart `next dev` after env changes. ' +
    'On the host, use API_URL=http://localhost:3003 and avoid WEB_API_URL=http://api:... unless the web app runs inside Docker.'
  );
}

/** Same port/path on 127.0.0.1 when the base uses `localhost` (avoids some host resolver/fetch quirks). */
function localhostAsIpv4Base(base: string): string | null {
  try {
    const u = new URL(base);
    if (u.hostname !== 'localhost') return null;
    u.hostname = '127.0.0.1';
    return stripTrailingSlash(u.toString());
  } catch {
    return null;
  }
}

/** Ordered bases to try; avoid localhost fallbacks inside Docker (`localhost` is the web container, not Nest). */
function storefrontApiCandidateBases(): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (raw: string | undefined) => {
    if (!raw) return;
    const s = stripTrailingSlash(raw.trim());
    if (!s || seen.has(s)) return;
    seen.add(s);
    out.push(s);
  };

  push(getWebApiBaseUrl());

  const inDocker = isDockerRuntime();
  if (!inDocker) {
    push(process.env.API_URL);
    const first = out[0];
    if (first) {
      push(localhostAsIpv4Base(first) ?? undefined);
    }
    if (process.env.NODE_ENV !== 'production') {
      push('http://127.0.0.1:3003');
      push('http://localhost:3003');
    }
  }

  return out;
}

/** Server-side fetch to Nest; tries alternate bases on the host (API_URL / 127.0.0.1) after connection failures. */
export async function storefrontApiFetch(path: string, init?: RequestInit): Promise<Response> {
  const p = path.startsWith('/') ? path : `/${path}`;
  const bases = storefrontApiCandidateBases();
  let lastErr: unknown;
  for (const base of bases) {
    const url = `${base}${p}`;
    try {
      return await fetch(url, { cache: 'no-store', ...init });
    } catch (err) {
      lastErr = err;
    }
  }
  const cause = lastErr instanceof Error ? lastErr.message : String(lastErr);
  throw new Error(`API fetch failed (${cause}) tried: ${bases.join(', ')}. ${reachabilityHint()}`);
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await storefrontApiFetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const payload = (await response.json()) as { success?: boolean; data?: T; error?: { message?: string; code?: string } };
  if (!response.ok || payload.success === false) {
    throw new Error(customerFacingMessageFromApi(response.status, payload.error, 'İstek tamamlanamadı.'));
  }
  return (payload.data ?? payload) as T;
}
