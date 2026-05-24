#!/usr/bin/env node
/**
 * Mobil ↔ API kontratı — Faz A ve isteğe bağlı OpenAPI karşılaştırması (Faz B).
 *
 * `pnpm mobile:sync-check [--openapi]`
 */
import fs from 'node:fs/promises';
import path from 'node:path';

import { fetchOpenApiJson, OPENAPI_SNAPSHOT_REL, yazSnapshot } from './export-openapi-helper.ts';
import type { DoctorSummaryRow } from '../lib/logger.ts';
import { fail, info, ok, section, yazOzet } from '../lib/logger.ts';
import { kokEnvYukle } from '../lib/root-dotenv.ts';
import { REPO_ROOT } from '../lib/repo-root.ts';
import { runPnpm } from '../lib/run.ts';

async function mobilKullanilanEndpointler(): Promise<string[]> {
  const clientPath = path.join(REPO_ROOT, 'apps', 'mobile', 'src', 'api', 'client.ts');
  const kaynak = await fs.readFile(clientPath, 'utf8');
  const tirnaklı = /\B(['"])(\/api\/v1[^'"\\]+)\1/g;
  const sablon = /`(\/api\/v1[^`]+)`/g;
  const bulunan = new Set<string>();

  function ekleHam(hamRaw: string): void {
    const ham = hamRaw.trim();
    if (!ham.startsWith('/api/v1')) return;
    const yol = ham.replace(/\$\{[^}]+\}/g, '*').split('?')[0];
    bulunan.add(yol ?? ham);
  }

  tirnaklı.lastIndex = 0;
  for (;;) {
    const m = tirnaklı.exec(kaynak);
    if (!m) break;
    ekleHam(m[2] ?? '');
  }

  sablon.lastIndex = 0;
  for (;;) {
    const m = sablon.exec(kaynak);
    if (!m) break;
    ekleHam(m[1] ?? '');
  }

  return [...bulunan].sort((a, b) => a.localeCompare(b));
}

async function openapiDiff(snapshotPath: string, fetched: unknown): Promise<boolean> {
  try {
    const ham = await fs.readFile(snapshotPath, 'utf8');
    const mevcut = JSON.parse(ham) as Record<string, unknown>;
    const s1 = JSON.stringify(mevcut, null, 2);
    const s2 = JSON.stringify(fetched, null, 2);
    return s1 === s2;
  } catch {
    return false;
  }
}

async function ana(): Promise<number> {
  const raw = process.argv.includes('--openapi');
  const yazRapor = process.argv.includes('--report');
  const tumu: DoctorSummaryRow[] = [];
  const started = Date.now();

  section('Mobil expo-doctor');
  const doc = await runPnpm(['--filter', '@pastane/mobile', 'exec', 'expo-doctor']);
  tumu.push({
    adim: 'expo-doctor',
    sonuc: doc === 0 ? 'ok' : 'warn',
    detay: doc === 0 ? '' : 'Uyarıları inceleyin',
  });

  section('Mobil TypeScript');
  const tc = await runPnpm(['--filter', '@pastane/mobile', 'run', 'typecheck']);
  tumu.push({ adim: 'Mobil typecheck', sonuc: tc === 0 ? 'ok' : 'fail' });

  section('Mobil kullanılan API yolları (statik)');
  const yollar = await mobilKullanilanEndpointler();
  tumu.push({
    adim: `client.ts içinden ${yollar.length} benzersiz yol`,
    sonuc: 'ok',
    detay: yollar.slice(0, 12).join(', ') + (yollar.length > 12 ? '…' : ''),
  });

  if (raw) {
    section('OpenAPI anlık görüntü');
    const env = await kokEnvYukle();
    const json = await fetchOpenApiJson(env);
    if (!json) {
      tumu.push({
        adim: 'OpenAPI GET',
        sonuc: 'warn',
        detay:
          'İndirilemedi — SWAGGER_ENABLED=true ile API’yi çalıştırın (.env) veya OPENAPI_EXPORT_URL verin',
      });
    } else {
      const snapshotAbs = path.join(REPO_ROOT, OPENAPI_SNAPSHOT_REL);
      let ilkYazım = false;
      try {
        await fs.access(snapshotAbs);
      } catch {
        ilkYazım = true;
        await yazSnapshot(json);
        tumu.push({
          adim: OPENAPI_SNAPSHOT_REL,
          sonuc: 'ok',
          detay: 'İlk openapi.snapshot.json oluşturuldu — commit etmeyi düşünün',
        });
      }

      if (!ilkYazım) {
        const aynı = await openapiDiff(snapshotAbs, json);
        tumu.push({
          adim: `OpenAPI ile ${OPENAPI_SNAPSHOT_REL} karşılaştırması`,
          sonuc: aynı ? 'ok' : 'warn',
          detay: aynı ? '' : 'Fark var — API veya mobil çağrılarını gözden geçirin',
        });
      }
    }
  }

  yazOzet(tumu, Date.now() - started);

  if (yazRapor) {
    const rp = path.join(REPO_ROOT, 'reports', 'last-mobile-sync.json');
    await fs.mkdir(path.dirname(rp), { recursive: true }).catch(() => undefined);
    await fs.writeFile(
      rp,
      `${JSON.stringify({ zaman: new Date().toISOString(), ozet: tumu, statikYollar: yollar }, null, 2)}\n`,
      'utf8',
    );
    info(`Rapor: ${path.relative(REPO_ROOT, rp)}`);
  }

  if (tumu.some((r) => r.sonuc === 'fail')) {
    fail('Mobil sync-check başarısız.');
    return 1;
  }
  return 0;
}

ana()
  .then((k) => {
    process.exitCode = k;
  })
  .catch(() => {
    process.exitCode = 1;
  });
