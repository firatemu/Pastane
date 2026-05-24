import fs from 'node:fs/promises';
import path from 'node:path';

import type { DoctorSummaryRow } from '../lib/logger.ts';
import { warn } from '../lib/logger.ts';
import { REPO_ROOT } from '../lib/repo-root.ts';

export async function checkDepsTurboHint(): Promise<DoctorSummaryRow[]> {
  const rows: DoctorSummaryRow[] = [];
  const nm = path.join(REPO_ROOT, 'node_modules');
  try {
    const st = await fs.stat(nm);
    if (!st.isDirectory()) {
      rows.push({ adim: 'node_modules', sonuc: 'fail', detay: 'Geçersiz — pnpm install' });
      return rows;
    }
  } catch {
    warn('node_modules yok — `pnpm install` çalıştırın.');
    rows.push({ adim: 'node_modules', sonuc: 'warn', detay: 'pnpm install gerekli' });
    return rows;
  }

  rows.push({ adim: 'node_modules', sonuc: 'ok' });

  rows.push({
    adim: 'Turbo önbellek',
    sonuc: 'warn',
    detay: 'Gerekirse: pnpm turbo run lint --force veya ~/.cache kontrolü',
  });

  return rows;
}
