#!/usr/bin/env node
/**
 * Üretime göndermeden önce doctor + kontroller + opsiyonel e2e, ardından `pnpm push:vps` sarmalı.
 *
 * `pnpm deploy:prod [--skip-doctor] [--with-e2e] -- [push:vps seçenekleri]`
 */
import { ok, section } from '../lib/logger.ts';
import { runBash, runPnpm } from '../lib/run.ts';

function pushVpsArgv(): readonly string[] {
  const kes = process.argv.indexOf('--');
  if (kes >= 0) return process.argv.slice(kes + 1);
  return [];
}

async function main(): Promise<number> {
  const skipDoctor = process.argv.includes('--skip-doctor');
  const withE2e = process.argv.includes('--with-e2e');
  const vpsArgv = [...pushVpsArgv()];

  if (!skipDoctor) {
    section('Doctor (öz kontrol)');
    const d = await runPnpm(['doctor']);
    if (d !== 0) return d;
  }

  section('Tam doğrulama (lint, typecheck, test, build:ci)');
  const chk = await runPnpm(['check']);
  if (chk !== 0) return chk;

  if (withE2e) {
    ok('Uzun sürecek: tam E2E yığını (docker compose dahil)');
    section('Playwright + docker e2e');
    const er = await runBash('scripts/ci-e2e.sh');
    if (er !== 0) return er;
  }

  section('VPS gönderimi (scripts/push-vps.sh)');
  const pus = await runBash('scripts/push-vps.sh', vpsArgv);
  return pus === 0 ? 0 : pus;
}

main().then((c) => {
  process.exitCode = c;
});
