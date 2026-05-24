import fs from 'node:fs/promises';
import path from 'node:path';

import { parseDotEnvSatirleri } from './dotenv-lite.ts';
import { REPO_ROOT } from './repo-root.ts';

export async function kokEnvYukle(dosya = '.env'): Promise<Record<string, string>> {
  try {
    const raw = await fs.readFile(path.join(REPO_ROOT, dosya), 'utf8');
    return parseDotEnvSatirleri(raw);
  } catch {
    return {};
  }
}
