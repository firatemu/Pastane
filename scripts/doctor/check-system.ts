import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

import type { DoctorSummaryRow } from '../lib/logger.ts';
import { REPO_ROOT } from '../lib/repo-root.ts';

function execText(cmd: string, args: string[]): Promise<{ ok: boolean; stdout: string }> {
  return new Promise((resolve) => {
    execFile(cmd, args, { cwd: REPO_ROOT }, (err, stdout, stderr) => {
      if (err) {
        resolve({ ok: false, stdout: String(stderr || stdout || err.message) });
        return;
      }
      resolve({ ok: true, stdout: String(stdout || '') });
    });
  });
}

export async function checkSystem(): Promise<DoctorSummaryRow[]> {
  const rows: DoctorSummaryRow[] = [];

  const nodeMajor = Number.parseInt(process.versions.node.split('.')[0] ?? '', 10);
  if (Number.isNaN(nodeMajor) || nodeMajor < 22 || nodeMajor >= 23) {
    rows.push({
      adim: `Node.js sürümü (${process.version})`,
      sonuc: 'fail',
      detay: 'engines.node: >=22 <23 — nvm kullanıp 22 seçin',
    });
  } else {
    rows.push({ adim: `Node.js ${process.version}`, sonuc: 'ok' });
  }

  try {
    const pkgRaw = await fs.readFile(path.join(REPO_ROOT, 'package.json'), 'utf8');
    const pkg = JSON.parse(pkgRaw) as { packageManager?: string };
    const beklenenPm = pkg.packageManager?.startsWith('pnpm@') ? pkg.packageManager.slice('pnpm@'.length) : '';
    const pnpmV = await execText(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', ['--version']);
    if (!pnpmV.ok || !pnpmV.stdout.trim()) {
      rows.push({ adim: 'pnpm sürümü', sonuc: 'fail', detay: 'pnpm bulunamadı veya çalışmıyor' });
    } else {
      const yuklu = pnpmV.stdout.trim();
      const uyumsuz = !!(beklenenPm && yuklu !== beklenenPm.trim());
      rows.push(
        uyumsuz
          ? {
              adim: `pnpm ${yuklu}`,
              sonuc: 'warn',
              detay: `package.json bekliyor pnpm@${beklenenPm}`,
            }
          : { adim: `pnpm ${yuklu}`, sonuc: 'ok' },
      );
    }
  } catch {
    rows.push({ adim: 'package.json okuma', sonuc: 'warn' });
  }

  const dk = await execText(process.platform === 'win32' ? 'docker.exe' : 'docker', ['info']);
  if (!dk.ok) {
    rows.push({
      adim: 'Docker daemon',
      sonuc: 'warn',
      detay: 'docker info başarısız — Docker kapalı olabilir (compose doctor atlar)',
    });
  } else {
    rows.push({ adim: 'Docker daemon', sonuc: 'ok' });
  }

  const comp = await execText(process.platform === 'win32' ? 'docker.exe' : 'docker', ['compose', 'version']);
  rows.push(
    comp.ok
      ? {
          adim: 'Docker Compose',
          sonuc: 'ok',
          detay: comp.stdout.trim().split('\n')[0]?.slice(0, 80),
        }
      : { adim: 'Docker Compose', sonuc: 'warn', detay: comp.stdout.trim().slice(0, 120) },
  );

  return rows;
}
