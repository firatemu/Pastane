#!/usr/bin/env node
/**
 * Yerel doktor: sistem, ortam, Docker dev, Prisma, Next önbellek ipuçları.
 *
 * Konumları: `pnpm doctor`, `pnpm doctor:api`, `pnpm doctor:mobile`, `pnpm doctor:frontend`
 * veya: `pnpm exec tsx --tsconfig scripts/tsconfig.json scripts/doctor/index.ts [core|api|mobile|frontend]`
 */
import fs from 'node:fs/promises';
import path from 'node:path';

import { checkComposeDev } from './check-compose-dev.ts';
import { checkDevVsProductionData } from './check-dev-vs-prod-env.ts';
import { checkDepsTurboHint } from './check-deps.ts';
import { checkEnvFiles } from './check-env.ts';
import { checkNextCaches } from './check-next-cache.ts';
import { checkPrismaCache } from './check-prisma-cache.ts';
import { checkSystem } from './check-system.ts';
import type { DoctorSummaryRow } from '../lib/logger.ts';
import { fail, info, ok, section, yazOzet } from '../lib/logger.ts';
import { kokEnvYukle } from '../lib/root-dotenv.ts';
import { REPO_ROOT } from '../lib/repo-root.ts';
import { runBash, runPnpm } from '../lib/run.ts';

type Mode = 'core' | 'api' | 'mobile' | 'frontend';

function pozisyonelMod(raw: readonly string[]): Mode {
  const modes = new Set<Mode>(['core', 'api', 'mobile', 'frontend']);
  for (const a of raw) {
    if (!a.startsWith('-') && modes.has(a.toLowerCase() as Mode)) return a.toLowerCase() as Mode;
  }
  return 'core';
}

async function apiHealthSatir(apiBase: string | undefined): Promise<DoctorSummaryRow> {
  const url =
    apiBase && apiBase.startsWith('http')
      ? `${apiBase.replace(/\/$/, '')}/health`
      : 'http://127.0.0.1:3003/health';
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const txt = await res.text();
    if (res.ok && txt.includes('"status":"ok"')) {
      return { adim: 'API GET /health', sonuc: 'ok', detay: url };
    }
    return { adim: 'API GET /health', sonuc: 'warn', detay: `Yanıt beklenenden farklı (${res.status})` };
  } catch {
    return {
      adim: 'API GET /health',
      sonuc: 'warn',
      detay: `${url} ulaşılamadı — API kapalı olabilir`,
    };
  }
}

async function temelPaket(doctorSatirlariOkunakli: DoctorSummaryRow[], skipCompose: boolean): Promise<void> {
  section('Sistem');
  doctorSatirlariOkunakli.push(...(await checkSystem()));

  section('Ortam dosyaları');
  doctorSatirlariOkunakli.push(...(await checkEnvFiles()));
  doctorSatirlariOkunakli.push(...(await checkDevVsProductionData()));

  const envProdPath = path.join(REPO_ROOT, '.env.production');
  try {
    await fs.access(envProdPath);
    info('.env.production bulundu — validate-env çalıştırılıyor.');
    const k = await runBash('scripts/validate-env.sh', [envProdPath]);
    doctorSatirlariOkunakli.push({
      adim: 'scripts/validate-env.sh (.env.production)',
      sonuc: k === 0 ? 'ok' : 'fail',
      detay: k === 0 ? 'Şablon kontrolü geçti' : 'Kritik değişken veya yapı eksik',
    });
  } catch {
    /* prod env yok: normal yerel için */
  }

  section('Bağımlılıklar / Turbo');
  doctorSatirlariOkunakli.push(...(await checkDepsTurboHint()));

  section('Prisma');
  doctorSatirlariOkunakli.push(...(await checkPrismaCache()));

  section('Next önbellek klasörleri');
  doctorSatirlariOkunakli.push(...(await checkNextCaches()));

  if (!skipCompose) {
    section('Docker Compose (geliştirme)');
    const dockerRow = await checkComposeDev(/* skipIfNoDocker */ true);
    doctorSatirlariOkunakli.push(dockerRow);
  }
}

async function modApi(rows: DoctorSummaryRow[], skipCompose: boolean, withApiTests: boolean): Promise<void> {
  await temelPaket(rows, skipCompose);

  section('API paketi (Turbo)');
  const tc = await runPnpm(['exec', 'turbo', 'run', 'typecheck', '--filter=@pastane/api']);
  rows.push({
    adim: 'Turbo typecheck (@pastane/api)',
    sonuc: tc === 0 ? 'ok' : 'fail',
  });
  const b = await runPnpm(['exec', 'turbo', 'run', 'build', '--filter=@pastane/api']);
  rows.push({
    adim: 'Turbo build (@pastane/api)',
    sonuc: b === 0 ? 'ok' : 'fail',
  });
  if (withApiTests) {
    const t = await runPnpm(['exec', 'turbo', 'run', 'test', '--filter=@pastane/api']);
    rows.push({
      adim: 'Turbo test (@pastane/api)',
      sonuc: t === 0 ? 'ok' : 'fail',
    });
  } else {
    ok('Tam test için: DOCTOR_WITH_API_TESTS=1 veya `--with-api-tests` ile tekrarlayın.');
  }

  section('Çalışan API sağlık');
  const env = await kokEnvYukle();
  const publicApi = env.PUBLIC_API_URL ?? env.API_URL ?? env.WEB_API_URL;
  rows.push(await apiHealthSatir(publicApi));
}

async function modMobile(rows: DoctorSummaryRow[], skipCompose: boolean): Promise<void> {
  section('Ön ortam kontrolleri');
  rows.push(...(await checkSystem()));
  rows.push(...(await checkEnvFiles()));
  rows.push(...(await checkDevVsProductionData()));
  rows.push(...(await checkDepsTurboHint()));

  if (!skipCompose) {
    section('Docker Compose (geliştirme)');
    rows.push(await checkComposeDev(true));
  }

  section('Expo doctor');
  const exp = await runPnpm(['--filter', '@pastane/mobile', 'exec', 'expo-doctor']);
  rows.push({
    adim: 'expo-doctor (@pastane/mobile)',
    sonuc: exp === 0 ? 'ok' : 'warn',
    detay: exp === 0 ? '' : 'Çıktıları inceleyin (paket uyumsuzlukları)',
  });

  section('Mobil typecheck');
  const tc = await runPnpm(['--filter', '@pastane/mobile', 'run', 'typecheck']);
  rows.push({
    adim: '@pastane/mobile typecheck',
    sonuc: tc === 0 ? 'ok' : 'fail',
  });
}

async function modFrontend(rows: DoctorSummaryRow[], withSmoke: boolean): Promise<void> {
  rows.push(...(await checkDepsTurboHint()));

  section('Frontend turbo (lint + typecheck)');
  const filt = ['--filter=@pastane/web', '--filter=@pastane/admin', '--filter=@pastane/courier'];
  const lint = await runPnpm(['exec', 'turbo', 'run', 'lint', ...filt]);
  rows.push({ adim: 'Turbo lint (web+admin+courier)', sonuc: lint === 0 ? 'ok' : 'fail' });
  const tc = await runPnpm(['exec', 'turbo', 'run', 'typecheck', ...filt]);
  rows.push({
    adim: 'Turbo typecheck (web+admin+courier)',
    sonuc: tc === 0 ? 'ok' : 'fail',
  });

  if (withSmoke) {
    section('Playwright @smoke');
    ok('Smoke E2E: `pnpm e2e:smoke` (stack ayakta olmalı)');
    const s = await runPnpm(['e2e:smoke']);
    rows.push({
      adim: 'Playwright smoke (tüm süitler)',
      sonuc: s === 0 ? 'ok' : 'fail',
    });
  }
}

async function raporDosyasiYaz(rows: DoctorSummaryRow[]): Promise<void> {
  const dir = path.join(REPO_ROOT, 'reports');
  await fs.mkdir(dir, { recursive: true }).catch(() => undefined);
  const hedef = path.join(dir, 'last-doctor.json');
  const zaman = new Date().toISOString();
  await fs.writeFile(
    hedef,
    `${JSON.stringify({ zaman, ozet: rows }, null, 2)}\n`,
    'utf8',
  );
  info(`Özet yazıldı: ${path.relative(REPO_ROOT, hedef)}`);
}

async function main(): Promise<number> {
  const raw = process.argv.slice(2);
  const yazRapor = raw.includes('--report');
  const skipCompose = raw.includes('--skip-compose');
  const withApiTests =
    raw.includes('--with-api-tests') || process.env.DOCTOR_WITH_API_TESTS === '1';
  const withSmoke = raw.includes('--with-smoke');
  const mod = pozisyonelMod(raw);

  const tumu: DoctorSummaryRow[] = [];
  const started = Date.now();

  info(`Doctor modu: ${mod}`);
  try {
    if (mod === 'core') await temelPaket(tumu, skipCompose);
    else if (mod === 'api') await modApi(tumu, skipCompose, withApiTests);
    else if (mod === 'mobile') await modMobile(tumu, skipCompose);
    else await modFrontend(tumu, withSmoke);

    yazOzet(tumu, Date.now() - started);
    if (yazRapor) await raporDosyasiYaz(tumu);

    if (tumu.some((r) => r.sonuc === 'fail')) {
      fail('Doctor: kritik sorunlar var (yukarıdaki ✖ satırlar).');
      return 1;
    }
    return 0;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    fail(`Doctor beklenmeyen hata: ${msg}`);
    return 1;
  }
}

main()
  .then((k) => {
    process.exitCode = k;
  })
  .catch(() => {
    process.exitCode = 1;
  });
