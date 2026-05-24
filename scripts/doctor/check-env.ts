import fs from 'node:fs/promises';
import path from 'node:path';

import type { DoctorSummaryRow } from '../lib/logger.ts';
import { warn } from '../lib/logger.ts';
import { REPO_ROOT } from '../lib/repo-root.ts';

const ROOT_ENV_KEYS = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'NEXT_PUBLIC_SITE_URL'];

const MOBILE_ENV_FILES = ['.env.development', '.env'] as const;

async function dosyaOk(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

function parseEnvPlaceholder(content: string, key: string): string | null {
  const re = new RegExp(`^[ \\t]*${key}=(.*)$`, 'gm');
  const m = [...content.matchAll(re)].pop()?.[1];
  if (!m) return null;
  return m.replace(/^["']|["']$/g, '').trim();
}

export async function checkEnvFiles(): Promise<DoctorSummaryRow[]> {
  const rows: DoctorSummaryRow[] = [];

  const envRoot = path.join(REPO_ROOT, '.env');
  const envProd = path.join(REPO_ROOT, '.env.production');
  const envExample = path.join(REPO_ROOT, '.env.example');

  let hasRoot = await dosyaOk(envRoot);
  const hasExample = await dosyaOk(envExample);
  const hasProd = await dosyaOk(envProd);

  if (!hasRoot && hasExample) {
    warn('.env eksik — `cp .env.example .env` önerilir (Docker/dev için zorunlu).');
    rows.push({
      adim: 'Repo .env dosyası',
      sonuc: 'warn',
      detay: 'Yok (.env.example kopyalayın)',
    });
  } else if (hasRoot) {
    rows.push({ adim: 'Repo .env dosyası', sonuc: 'ok' });
    const raw = await fs.readFile(envRoot, 'utf8');
    let bosSay = 0;
    for (const k of ROOT_ENV_KEYS) {
      const v = parseEnvPlaceholder(raw, k);
      if (!v || v.length === 0) bosSay += 1;
    }
    if (bosSay > 0) {
      rows.push({
        adim: 'Kök .env kritik anahtarlar',
        sonuc: 'warn',
        detay: `${bosSay} alan eksik olabilir (şablonu kontrol edin)`,
      });
    }
  }

  rows.push({
    adim: '.env.production (repo kökü)',
    sonuc: hasProd ? 'ok' : 'warn',
    detay: hasProd
      ? 'Bulundu (çoğu geliştiricide gerekmez; push-vps validate-env kullanır — VPS sırları burada durmasın)'
      : 'Yok — normal; üretim env yalnızca sunucuda (.env.production.example şablonu)',
  });

  const mobileRoot = path.join(REPO_ROOT, 'apps', 'mobile');
  let mobileOk = false;
  for (const f of MOBILE_ENV_FILES) {
    const p = path.join(mobileRoot, f);
    // eslint-disable-next-line no-await-in-loop -- sıralı küçük kontrol
    if (await dosyaOk(p)) {
      mobileOk = true;
      const raw = await fs.readFile(p, 'utf8');
      const api = parseEnvPlaceholder(raw, 'EXPO_PUBLIC_API_URL');
      if (!api || !api.startsWith('http')) {
        rows.push({
          adim: `Mobil ${f}`,
          sonuc: 'warn',
          detay: 'EXPO_PUBLIC_API_URL tanımlı değil',
        });
      } else {
        rows.push({ adim: `Mobil ${f}`, sonuc: 'ok', detay: 'EXPO_PUBLIC_API_URL var' });
      }
      break;
    }
  }
  if (!mobileOk) {
    rows.push({
      adim: 'Mobil env',
      sonuc: 'warn',
      detay: 'apps/mobile/.env.development veya .env yok — README bakın',
    });
  }

  return rows;
}
