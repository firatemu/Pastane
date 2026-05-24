import { spawn } from 'node:child_process';
import type { DoctorSummaryRow } from '../lib/logger.ts';
import { warn } from '../lib/logger.ts';
import { kokEnvYukle } from '../lib/root-dotenv.ts';
import { REPO_ROOT } from '../lib/repo-root.ts';
import { runPnpm } from '../lib/run.ts';

function execPrismaMigrateStatus(extraEnv: Record<string, string>): Promise<number> {
  const cmd = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
  return new Promise((resolve) => {
    const child = spawn(
      cmd,
      ['--filter', '@pastane/database', 'exec', 'prisma', 'migrate', 'status'],
      {
        cwd: REPO_ROOT,
        stdio: 'inherit',
        shell: process.platform === 'win32',
        env: { ...process.env, ...extraEnv },
      },
    );
    child.on('error', () => resolve(1));
    child.on('close', (code) => resolve(code ?? 1));
  });
}

export async function checkPrismaCache(): Promise<DoctorSummaryRow[]> {
  const rows: DoctorSummaryRow[] = [];

  const genCode = await runPnpm(['prisma:generate']);
  rows.push(
    genCode === 0
      ? { adim: 'Prisma generate', sonuc: 'ok' }
      : {
          adim: 'Prisma generate',
          sonuc: 'fail',
          detay: 'pnpm prisma:generate hata koduyla bitti — bağımlılıkları kontrol edin',
        },
  );

  const merged = await kokEnvYukle();

  let dbUrl = process.env.DATABASE_URL ?? merged.DATABASE_URL;
  if (!dbUrl?.trim()) {
    warn('DATABASE_URL yok — `prisma migrate status` yerel doğrulanamıyor (Docker API içinde deneyebilirsiniz).');
    rows.push({
      adim: 'Prisma migrate status',
      sonuc: 'warn',
      detay: 'DATABASE_URL tanımlı değil',
    });
    return rows;
  }

  const code = await execPrismaMigrateStatus({ DATABASE_URL: dbUrl });
  rows.push(
    code === 0
      ? { adim: 'Prisma migrate status', sonuc: 'ok' }
      : {
          adim: 'Prisma migrate status',
          sonuc: 'fail',
          detay: 'Geçiş uyuşmazlığı olabilir veya DB erişimi yok',
        },
  );

  return rows;
}
