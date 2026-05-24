#!/usr/bin/env node
/**
 * VPS ön doğrulama: disk, Docker süreçleri (SSH üzerinden, BatchMode=yes).
 *
 * `pnpm verify:vps` — VPS_HOST için scripts/deploy-vps.env.local beklenir.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';

import { bashCiftTırnak } from '../lib/bash-quote.ts';
import { loadDeployVpsConfig } from '../lib/deploy-vps-load.ts';
import { fail, info, ok, section } from '../lib/logger.ts';

async function sshKomutUzaktan(remoteBashChunk: string, cfg: Awaited<ReturnType<typeof loadDeployVpsConfig>>): Promise<number> {
  const args = [`-p${cfg.vpsPort}`, '-o', 'BatchMode=yes', `${cfg.vpsUser}@${cfg.vpsHost}`];
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
    ssh.stdin?.end(remoteBashChunk);
    ssh.on('error', () => resolve(127));
    ssh.on('close', (code) => resolve(code ?? 1));
  });
}

async function main(): Promise<number> {
  section('VPS ön doğrulama');

  const cfg = await loadDeployVpsConfig();
  if (!cfg.vpsHost) {
    fail('VPS_HOST tanımlı değil — scripts/deploy-vps.env.local oluşturun.');
    return 1;
  }

  ok(`Bağlantı: ${cfg.vpsUser}@${cfg.vpsHost}:${cfg.vpsPort} (${cfg.vpsAppDir})`);

  const d = bashCiftTırnak(cfg.vpsAppDir);
  const script = `set -euo pipefail
echo "══════════════════════════════════════════════════"
echo "[Pastane verify] Uygulama dizini (${d})"
cd ${d} || { echo "::error Uygulama dizinine gidilemedi"; exit 1; }
pwd
echo "[Pastane verify] Disk kullanımı (/)"
df -h / | tail -n 1 || true
echo "[Pastane verify] Docker (aktif konteynerler)"
docker ps --format "table {{.Names}}\t{{.Status}}" 2>/dev/null || echo "⚠ docker ps kullanılamadı"
echo "[Pastane verify] Prod compose durumu"
if docker compose version >/dev/null 2>&1 && [ -f .env.production ]; then
  docker compose --env-file .env.production -f docker/docker-compose.prod.yml ps 2>/dev/null \
    || echo "⚠ docker compose ps çalıştırılamadı"
elif [ ! -f .env.production ]; then
  echo "⚠ Kök dizinde .env.production yok — kontrol bağlamı doğrulanamadı"
else
  echo "⚠ docker compose bulunamadı"
fi
echo "══════════════════════════════════════════════════"
`;

  info('SSH ile doğrulama çalıştırılıyor…');
  const k = await sshKomutUzaktan(script, cfg);
  if (k !== 0) {
    fail(`SSH çıkış kodu: ${k}`);
    return k;
  }
  ok('VPS doğrulama tamamlandı.');
  return 0;
}

main().then((c) => {
  process.exitCode = c;
});
