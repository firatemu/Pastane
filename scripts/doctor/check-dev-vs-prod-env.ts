import fs from 'node:fs/promises';
import path from 'node:path';

import type { DoctorSummaryRow } from '../lib/logger.ts';
import { fail as logFail, warn } from '../lib/logger.ts';
import { REPO_ROOT } from '../lib/repo-root.ts';

/** Minimal .env anahtarı okuma (yüklenen sıra ile son değer). */
function parseDotenvValue(content: string, key: string): string | null {
  const re = new RegExp(`^[ \\t]*${key}=(.*)$`, 'gm');
  const m = [...content.matchAll(re)].pop()?.[1];
  if (!m) return null;
  return m.replace(/^["']|["']$/g, '').trim();
}

/** Postgres URI host adı (`postgres`, `localhost` …). Şifreyi sızdırmaz. */
function postgresHost(databaseUrl: string): string | null {
  try {
    const trimmed = databaseUrl.trim();
    const body = trimmed.startsWith('postgresql://')
      ? trimmed.slice('postgresql://'.length)
      : trimmed.startsWith('postgres://')
        ? trimmed.slice('postgres://'.length)
        : '';
    if (!body) return null;
    const u = new URL(`http://${body}`);
    const h = u.hostname;
    return h ? h.toLowerCase().replace(/^\[|\]$/g, '') : null;
  } catch {
    return null;
  }
}

/** Docker dev + yaygın host geliştirme hedefleri. */
const ACCEPTABLE_PG_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '[::1]',
  'postgres',
  'host.docker.internal',
]);

/**
 * Yerel tek-kiracı şablonu; tarayıcıdaki ortak API / site adresleri uyarısı.
 * Ekip için farklı üretim alanı kullanılıyorsa uyarı çıkmayabilir (bilinçli).
 */
const PRODUCTION_DOMAIN_HINTS = ['azem.cloud'];

export async function checkDevVsProductionData(): Promise<DoctorSummaryRow[]> {
  const rows: DoctorSummaryRow[] = [];

  const envPath = path.join(REPO_ROOT, '.env');
  const prodPath = path.join(REPO_ROOT, '.env.production');

  let rootRaw: string;
  try {
    rootRaw = await fs.readFile(envPath, 'utf8');
  } catch {
    rows.push({
      adim: 'Dev vs prod veri bağlantıları',
      sonuc: 'warn',
      detay: '.env yok — kontrol yapılamadı (.env.example kopyalayın)',
    });
    return rows;
  }

  const dbDev = parseDotenvValue(rootRaw, 'DATABASE_URL');
  const nodeEnv = parseDotenvValue(rootRaw, 'NODE_ENV');
  const publicApi = parseDotenvValue(rootRaw, 'PUBLIC_API_URL');
  const nextPublicApi = parseDotenvValue(rootRaw, 'NEXT_PUBLIC_API_URL');
  const webUrl = parseDotenvValue(rootRaw, 'WEB_URL');

  let prodRaw: string | null = null;
  try {
    prodRaw = await fs.readFile(prodPath, 'utf8');
  } catch {
    /* üretim env yok: çoğu yerelde normal */
  }

  const dbProd = prodRaw ? parseDotenvValue(prodRaw, 'DATABASE_URL') : null;

  if (!dbDev || dbDev.length === 0) {
    rows.push({
      adim: 'DATABASE_URL (.env)',
      sonuc: 'warn',
      detay: 'Boş veya tanımlı değil',
    });
  }

  if (dbDev && dbProd && dbDev === dbProd) {
    logFail(
      '.env DATABASE_URL ile .env.production aynı görünüyor — yerel kod üretim (veya aynı) veritabanını kullanıyor olabilir.',
    );
    rows.push({
      adim: 'Dev vs prod DATABASE_URL',
      sonuc: 'fail',
      detay: 'İki dosyada özdeş bağlantı dizesi',
    });
  }

  const hostPg = dbDev ? postgresHost(dbDev) : null;

  if (dbDev && !hostPg) {
    rows.push({
      adim: 'DATABASE_URL (.env)',
      sonuc: 'warn',
      detay: 'URL ayrıştırılamadı — formatı doğrulayın',
    });
  }

  if (hostPg && !ACCEPTABLE_PG_HOSTS.has(hostPg)) {
    warn(
      `.env PostgreSQL ana makinesi "${hostPg}" — docker-compose.dev genelde postgres:5432 (veya localhost) kullanır; uzaktaki DB üretim yedeği veya canlı ortam olabilir.`,
    );
    rows.push({
      adim: 'Dev PostgreSQL ana makinesi',
      sonuc: 'warn',
      detay: `${hostPg} (postgres/localhost dışında)`,
    });
  }

  if (nodeEnv?.toLowerCase() === 'production') {
    warn('.env NODE_ENV=production — yerel geliştirme için NODE_ENV=development beklenir.');
    rows.push({
      adim: '.env NODE_ENV',
      sonuc: 'warn',
      detay: 'production olarak ayarlı',
    });
  }

  for (const [label, url] of [
    ['PUBLIC_API_URL', publicApi],
    ['NEXT_PUBLIC_API_URL', nextPublicApi],
    ['WEB_URL', webUrl],
  ] as const) {
    if (!url) continue;
    const lower = url.toLowerCase();
    if (PRODUCTION_DOMAIN_HINTS.some((s) => lower.includes(s))) {
      warn(
        `${label} üretim alan adına işaret ediyor — Docker dev’te tarayıcı canlı ortama gitmesin diye localhost kullanın.`,
      );
      rows.push({
        adim: `Üretim alan uyarısı (${label})`,
        sonuc: 'warn',
        detay: 'alan adında üretim girdisi şüphesi',
      });
    }
  }

  const sorun = rows.some((r) => r.sonuc === 'warn' || r.sonuc === 'fail');
  if (!sorun) {
    const pgParca =
      hostPg && ACCEPTABLE_PG_HOSTS.has(hostPg)
        ? `PostgreSQL ana makinesi: ${hostPg}. `
        : 'PostgreSQL ana makinesi ayıklanmadı/bilinmiyor. ';
    const prodEnvParca = prodRaw ? '.env.production mevcut; DATABASE_URL özdeğil görünür. ' : '.env.production yok (çoğu yerelde normal). ';
    rows.push({
      adim: 'Dev vs prod veri özeti',
      sonuc: 'ok',
      detay: `${pgParca}${prodEnvParca}Üretim alan uyarısı yok.`,
    });
  }

  return rows;
}
