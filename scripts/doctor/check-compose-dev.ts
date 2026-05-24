import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

import type { DoctorSummaryRow } from '../lib/logger.ts';
import { warn } from '../lib/logger.ts';
import { REPO_ROOT } from '../lib/repo-root.ts';

const SERVICE_NAMES = ['postgres', 'redis', 'minio', 'api', 'web', 'admin', 'courier'] as const;

function composeFile(): string {
  return path.join(REPO_ROOT, 'docker', 'docker-compose.dev.yml');
}

async function composePs(): Promise<{ ok: boolean; raw: string }> {
  const envFile = path.join(REPO_ROOT, '.env');
  const args: string[] = ['compose'];
  try {
    await fs.access(envFile);
    args.push('--env-file', envFile);
  } catch {
    /* .env yoksa compose yine de çalışabilir (varsayılanlar) */
  }
  args.push('-f', composeFile(), 'ps', '--format', '{{.Service}}\t{{.State}}');

  return new Promise((resolve) => {
    execFile('docker', args, { cwd: REPO_ROOT }, (err, stdout, stderr) => {
      if (err) {
        resolve({ ok: false, raw: stderr || stdout || String(err.message) });
        return;
      }
      resolve({ ok: true, raw: stdout });
    });
  });
}

export async function checkComposeDev(skipIfNoDocker: boolean): Promise<DoctorSummaryRow> {
  try {
    const ps = await composePs();
    if (!ps.ok) {
      if (skipIfNoDocker) {
        warn('Docker compose ps çalışmadı — yığın kapalı olabilir veya `.env` eksik.');
        return { adim: 'Docker dev compose', sonuc: 'warn', detay: 'docker compose kullanılamadı' };
      }
      return { adim: 'Docker dev compose', sonuc: 'warn', detay: 'docker compose hatası' };
    }

    const lines = ps.raw
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const byService = new Map<string, string>();
    for (const line of lines) {
      const [svc, state] = line.split('\t');
      if (svc && state) byService.set(svc, state.toLowerCase());
    }

    const eksikler: string[] = [];
    const uyari: string[] = [];
    for (const svc of SERVICE_NAMES) {
      const st = byService.get(svc);
      if (!st) eksikler.push(`${svc}?`);
      else if (!st.includes('running')) uyari.push(`${svc}=${st}`);
    }

    if (eksikler.length && lines.length === 0) {
      return { adim: 'Docker dev compose', sonuc: 'warn', detay: 'Çalışan servis görünmüyor (.env + docker:dev:up?)' };
    }
    if (uyari.length) {
      return { adim: 'Docker dev compose', sonuc: 'warn', detay: uyari.join(', ') };
    }
    if (eksikler.length) {
      return { adim: 'Docker dev compose', sonuc: 'warn', detay: `Eksik/çalışmıyor: ${eksikler.join(', ')}` };
    }

    return { adim: 'Docker dev compose', sonuc: 'ok', detay: `${SERVICE_NAMES.length} servis running` };
  } catch {
    return { adim: 'Docker dev compose', sonuc: 'warn', detay: 'Compose kontrolü atlandı' };
  }
}

export async function composeEnvMissing(): Promise<boolean> {
  try {
    await fs.access(path.join(REPO_ROOT, '.env'));
    return false;
  } catch {
    return true;
  }
}
