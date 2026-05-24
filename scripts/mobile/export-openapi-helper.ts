/**
 * OpenAPI çıktısı — hem sync-check hem `pnpm mobile:openapi-export` için ortak mantık.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

import { REPO_ROOT } from '../lib/repo-root.ts';

export const OPENAPI_SNAPSHOT_REL = path.join('docs', 'contracts', 'openapi.snapshot.json');

export function loadOpenApiBaseler(env: Record<string, string>): readonly string[] {
  const ozel = process.env.OPENAPI_EXPORT_URL?.trim();
  if (ozel?.startsWith('http')) return [ozel.replace(/\/$/, '')];

  const varsayılanDev = 'http://127.0.0.1:3003';
  const apiUrl =
    env.PUBLIC_API_URL?.trim() ??
    env.API_URL?.trim() ??
    process.env.PUBLIC_API_URL ??
    process.env.API_URL ??
    '';

  const taban = apiUrl.startsWith('http') ? apiUrl.replace(/\/$/, '') : varsayılanDev;

  const devJson = `${varsayılanDev}/api/docs-json`;
  const sekme = `${taban}/api/docs-json`;
  if (sekme === devJson) return [devJson];
  return [sekme, devJson];
}

export async function fetchOpenApiJson(env: Record<string, string>): Promise<unknown | null> {
  const tabanlar = loadOpenApiBaseler(env);
  const timeoutMs = Number(process.env.OPENAPI_FETCH_TIMEOUT_MS ?? '12000');

  for (const kök of tabanlar) {
    const url =
      kök.includes('docs-json') || kök.endsWith('.json')
        ? kök
        : `${kök.replace(/\/$/, '')}/api/docs-json`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
      if (!res.ok) continue;
      return (await res.json()) as unknown;
    } catch {
      /* sonraki deneme */
    }
  }
  return null;
}

export async function yazSnapshot(json: unknown): Promise<void> {
  const hedef = path.join(REPO_ROOT, OPENAPI_SNAPSHOT_REL);
  await fs.mkdir(path.dirname(hedef), { recursive: true });
  await fs.writeFile(hedef, `${JSON.stringify(json, null, 2)}\n`, 'utf8');
}
