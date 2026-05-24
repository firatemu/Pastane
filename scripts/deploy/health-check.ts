#!/usr/bin/env node
/**
 * Üretim uçları için HTTP doğrulama (`API_HEALTH_TRIES`, `API_HEALTH_DELAY_SEC` ile uyumludur).
 *
 * Varsayılan: `.env.production`.
 *
 * `pnpm health:check [--env-file yol]`
 */
import fs from 'node:fs/promises';
import path from 'node:path';

import { parseDotEnvSatirleri } from '../lib/dotenv-lite.ts';
import { fail, ok, section } from '../lib/logger.ts';
import { REPO_ROOT } from '../lib/repo-root.ts';

function resolveEnvPath(): string {
  const kv = process.argv.find((a) => a.startsWith('--env-file='));
  if (kv) return kv.slice('--env-file='.length).trim();
  const ix = process.argv.indexOf('--env-file');
  if (ix >= 0 && process.argv[ix + 1]) return process.argv[ix + 1]!;
  return path.join(REPO_ROOT, '.env.production');
}

async function parseEnv(pathStr: string): Promise<Record<string, string>> {
  try {
    return parseDotEnvSatirleri(await fs.readFile(pathStr, 'utf8'));
  } catch {
    return {};
  }
}

async function probeHealth(urlStr: string, expectApiJson: boolean): Promise<boolean> {
  try {
    const res = await fetch(urlStr, { method: 'GET', signal: AbortSignal.timeout(15_000), redirect: 'follow' });
    if (!res.ok) return false;
    if (!expectApiJson) return true;
    const txt = await res.text();
    return txt.includes('"status":"ok"');
  } catch {
    return false;
  }
}

async function main(): Promise<number> {
  const envPath = resolveEnvPath();
  const parsed = await parseEnv(envPath);

  let apiHealth = process.env.API_HEALTH_URL?.trim() ?? '';

  const base =
    parsed.PUBLIC_API_URL?.trim() ??
    parsed.API_URL?.trim() ??
    parsed.NEXT_PUBLIC_API_URL?.trim() ??
    '';

  if (!apiHealth && base.startsWith('http'))
    apiHealth = base.endsWith('/health') ? base : `${base.replace(/\/$/, '')}/health`;

  const web = parsed.WEB_URL?.trim();
  const adm = parsed.ADMIN_URL?.trim();
  const courier = parsed.COURIER_URL?.trim();

  const probes: Array<{ title: string; url: string; api: boolean }> = [];
  if (apiHealth.startsWith('http')) probes.push({ title: 'API /health', url: apiHealth, api: true });
  if (web?.startsWith('http')) probes.push({ title: 'Web kökü', url: `${web.replace(/\/$/, '')}/`, api: false });
  if (adm?.startsWith('http'))
    probes.push({ title: 'Admin /login', url: `${adm.replace(/\/$/, '')}/login`, api: false });
  if (courier?.startsWith('http'))
    probes.push({ title: 'Courier /login', url: `${courier.replace(/\/$/, '')}/login`, api: false });

  if (!probes.length) {
    fail(`URL çıkarılamadı (${path.relative(REPO_ROOT, envPath)}). PUBLIC_API_URL / WEB_URL / API_HEALTH_URL ekleyin.`);
    return 1;
  }

  const tries = Number(parsed.API_HEALTH_TRIES ?? process.env.API_HEALTH_TRIES ?? process.env.HEALTH_TRIES ?? '30');
  const delaySec = Number(parsed.API_HEALTH_DELAY_SEC ?? process.env.API_HEALTH_DELAY_SEC ?? process.env.HEALTH_DELAY_SEC ?? '5');
  const delayMs = Number.isFinite(delaySec) ? delaySec * 1000 : 5000;

  section('Sağlık kontrolleri');

  outer: for (let attempt = 1; attempt <= tries; attempt += 1) {
    let allOkFlag = true;
    for (const p of probes) {
      let fine = false;
      try {
        fine = await probeHealth(p.url, p.api);
      } catch {
        fine = false;
      }
      if (!fine) {
        allOkFlag = false;
        ok(`⚠ (${attempt}/${tries}) ${p.title}`);
      }
    }
    if (!allOkFlag) {
      if (attempt >= tries) {
        fail(`${tries} deneme sonunda başarılı uç doğrulanamadı — loglara bakın.`);
        return 1;
      }
      ok(`⚠ Bekleniyor (${delayMs / 1000}s)…`);
      await new Promise((r) => setTimeout(r, delayMs));
      continue outer;
    }
    for (const p of probes) ok(`✔ ${p.title}`);
    ok(`Tamam (${attempt}/${tries}).`);
    break outer;
  }

  return 0;
}

main().then((c) => {
  process.exitCode = c;
});
