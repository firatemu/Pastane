#!/usr/bin/env node
/**
 * VPS üzerinde `scripts/rollback-prod.sh` çalıştırır (`IMAGE_TAG` dosyadan veya ortamdan).
 *
 * ```
 * IMAGE_TAG=v1.2.3 pnpm deploy:rollback
 * pnpm deploy:rollback --from-previous-tag
 * ```
 *
 * `pnpm deploy:rollback [--from-previous-tag] [--skip-health]`
 */
import { spawn } from 'node:child_process';
import path from 'node:path';

import { bashCiftTırnak } from '../lib/bash-quote.ts';
import { loadDeployVpsConfig } from '../lib/deploy-vps-load.ts';
import { fail, info, ok, section } from '../lib/logger.ts';
import { runPnpm } from '../lib/run.ts';

function isRollbackImageTag(tag: string): boolean {
  return /^[\w.-]+$/i.test(tag) && tag.length >= 2 && tag.length < 96;
}

async function sshBashstdin(body: string, cfg: Awaited<ReturnType<typeof loadDeployVpsConfig>>): Promise<number> {
  const args = ['-p', cfg.vpsPort, '-o', 'BatchMode=yes', `${cfg.vpsUser}@${cfg.vpsHost}`];
  const id = cfg.sshIdentity?.trim();
  if (id) {
    const expanded = id.startsWith('~/') ? path.join(process.env.HOME ?? '', id.slice(2)) : id;
    args.unshift('-i', expanded);
  }

  return new Promise((resolve) => {
    const ssh = spawn('ssh', [...args, 'bash', '-s'], {
      shell: process.platform === 'win32',
      stdio: ['pipe', 'inherit', 'inherit'],
    });
    ssh.stdin?.end(body);
    ssh.on('error', () => resolve(127));
    ssh.on('close', (code) => resolve(code ?? 1));
  });
}

async function main(): Promise<number> {
  const fromPrev = process.argv.includes('--from-previous-tag');
  const skipHealth = process.argv.includes('--skip-health');

  section('Rollback (VPS)');

  const cfg = await loadDeployVpsConfig();
  if (!cfg.vpsHost) {
    fail('VPS_HOST tanımlı değil — scripts/deploy-vps.env.local gerekiyor.');
    return 1;
  }

  const explicitTag = process.env.IMAGE_TAG?.trim() ?? '';

  if (fromPrev && explicitTag) {
    info('IMAGE_TAG dolu olduğu için `.pastane-deploy-previous-tag` okunmayacak (ortamdaki IMAGE_TAG kullanılır).');
  }

  if (!explicitTag && !fromPrev) {
    fail('IMAGE_TAG ortamına değer verin veya VPS’teki `.pastane-deploy-previous-tag` için `--from-previous-tag` kullanın.');
    return 1;
  }

  if (explicitTag && !isRollbackImageTag(explicitTag)) {
    fail('IMAGE_TAG biçimi beklenenden farklı (yalın sürüm dizesi verin).');
    return 2;
  }

  const dApp = bashCiftTırnak(cfg.vpsAppDir);

  let bash = [`set -euo pipefail`, `cd ${dApp}`].join('\n');

  if (explicitTag) {
    bash += `\nexport IMAGE_TAG=${bashCiftTırnak(explicitTag)}`;
  } else {
    bash += `
if [[ ! -f .pastane-deploy-previous-tag ]]; then echo "::error .pastane-deploy-previous-tag bulunamadı"; exit 4; fi
IMAGE_TAG="\$(tr -d '\\r\\n' < .pastane-deploy-previous-tag)"
export IMAGE_TAG`;
  }

  bash += `\nbash scripts/rollback-prod.sh\n`;

  ok(`SSH: ${cfg.vpsUser}@${cfg.vpsHost} → rollback-prod.sh`);

  const code = await sshBashstdin(`${bash}\n`, cfg);
  if (code !== 0) {
    fail(code === 127 ? 'ssh başlatılamadı.' : `Rollback çıkış kodu: ${code}`);
    return code;
  }

  if (!skipHealth) {
    info('Rollback sonrası yerel doğrulama: `pnpm health:check` (üretim URL’leri .env.production ile).');
    const hk = await runPnpm(['health:check']);
    if (hk !== 0) return hk;
  }

  ok('Rollback tamamlandı.');
  return 0;
}

main().then((c) => {
  process.exitCode = c;
});
