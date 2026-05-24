#!/usr/bin/env node
/**
 * Git ön doğrulama: düz çalışma alanı uyarısı, dal ipucu, isteğe bağlı conventional commit.
 *
 * Otomatik commit yoktur.
 *
 * `pnpm git:validate [--fail-on-dirty] [--check-last-commit-msg] [--fail-unless-main-branch] [--allow-non-main-branch]`
 */
import { execFile } from 'node:child_process';

import type { DoctorSummaryRow } from '../lib/logger.ts';
import { fail, ok, section, yazOzet } from '../lib/logger.ts';
import { REPO_ROOT } from '../lib/repo-root.ts';

function execGit(args: readonly string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    execFile('git', [...args], { cwd: REPO_ROOT }, (err, stdout, stderr) => {
      const stdoutStr = String(stdout ?? '');
      const stderrStr = String(stderr ?? '');
      let code = 0;
      if (err !== null) {
        const raw = err.code;
        code = typeof raw === 'number' && Number.isFinite(raw) ? raw : 1;
      }
      resolve({ code, stdout: stdoutStr, stderr: stderrStr });
    });
  });
}

function isConventionalHeadline(text: string): boolean {
  const s = text.trim();
  return /^(feat|fix|docs|chore|refactor|test|ci)(\([\w.`/-]+\))?!?:\s+\S.+$/.exec(s) !== null;
}

async function main(): Promise<number> {
  const failOnDirty = process.argv.includes('--fail-on-dirty');
  const conventional = process.argv.includes('--check-last-commit-msg');
  const failUnlessMain = process.argv.includes('--fail-unless-main-branch');

  const rows: DoctorSummaryRow[] = [];
  const started = Date.now();

  section('Git doğrulama');

  const status = await execGit(['status', '--porcelain']);
  if (status.code !== 0) {
    fail(`git status çalıştırılamadı (${status.stderr || status.stdout})`);
    return 2;
  }
  const dirty = status.stdout.trim().length > 0;

  rows.push({
    adim: 'Çalışma alanı kirliği',
    sonuc: failOnDirty && dirty ? 'fail' : dirty ? 'warn' : 'ok',
    detay: dirty ? 'Commit ya da stash sonrasında tekrar deneyin.' : '',
  });

  const branchOut = await execGit(['rev-parse', '--abbrev-ref', 'HEAD']);
  const branch = branchOut.stdout.trim();
  rows.push({
    adim: 'Dal',
    sonuc:
      branch === 'main' ? 'ok' : failUnlessMain ? 'fail' : 'warn',
    detay:
      branch === 'main'
        ? ''
        : failUnlessMain
          ? '`main` dışına VPS push istisnası gerektiriyor.'
          : `'${branch}' — push:vps varsayılanı main dalı bekler.`,
  });

  if (conventional) {
    const log = await execGit(['log', '-1', '--format=%s']);
    const headline = log.stdout.trim();
    rows.push({
      adim: 'Son commit başlığı (Conventional)',
      sonuc: isConventionalHeadline(headline) ? 'ok' : 'warn',
      detay: headline ? headline.slice(0, 140) : 'Commit başlığı alınamadı',
    });
  }

  yazOzet(rows, Date.now() - started);

  if (!failOnDirty) {
    ok('Not: `--fail-on-dirty` yoksa kirli dizin uyarılarına rağmen başarı çıkışı kullanılıyordur.');
  }

  if (rows.some((r) => r.sonuc === 'fail')) {
    fail('Git doğrulaması kritik gereksinimleri karşılamıyor.');
    return 1;
  }

  ok('Git ön doğrulama tamam.');
  return 0;
}

main().then((c) => {
  process.exitCode = c;
});
