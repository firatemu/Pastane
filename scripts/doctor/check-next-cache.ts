import fs from 'node:fs/promises';
import path from 'node:path';

import type { DoctorSummaryRow } from '../lib/logger.ts';
import { warn } from '../lib/logger.ts';
import { REPO_ROOT } from '../lib/repo-root.ts';

const NEXT_DIRS = ['.next-docker', '.next-ci', '.next'] as const;

export async function checkNextCaches(): Promise<DoctorSummaryRow[]> {
  const rows: DoctorSummaryRow[] = [];
  for (const app of ['web', 'admin', 'courier'] as const) {
    const base = path.join(REPO_ROOT, 'apps', app);
    for (const nd of NEXT_DIRS) {
      const dir = path.join(base, nd);
      const st = await fs.stat(dir).catch(() => undefined);
      if (st?.isDirectory()) {
        rows.push({
          adim: `apps/${app} ${nd}`,
          sonuc: 'ok',
          detay: 'Klasör mevcut — sorunda: bash scripts/fix-frontend-next-cache.sh',
        });
      }
    }
  }

  warn('Next build EACCES alırsanız: bash scripts/fix-next-perms.sh');
  rows.push({
    adim: 'Next izin ipucu',
    sonuc: 'warn',
    detay: 'scripts/fix-next-perms.sh, fix-frontend-next-cache.sh',
  });

  return rows;
}
