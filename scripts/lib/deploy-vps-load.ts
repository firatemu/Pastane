/**
 * Yerel makinede VPS SSH parametreleri (scripts/deploy-vps.env.local + process.env birleşimi).
 */
import fs from 'node:fs/promises';
import path from 'node:path';

import { parseDotEnvSatirleri } from './dotenv-lite.ts';
import { REPO_ROOT } from './repo-root.ts';

export interface DeployVpsConfig {
  vpsHost: string;
  vpsUser: string;
  vpsPort: string;
  vpsAppDir: string;
  /** ssh -i */
  sshIdentity?: string | undefined;
}

export async function loadDeployVpsConfig(): Promise<DeployVpsConfig> {
  const localPath = path.join(REPO_ROOT, 'scripts', 'deploy-vps.env.local');
  let parsed: Record<string, string> = {};
  try {
    const raw = await fs.readFile(localPath, 'utf8');
    parsed = parseDotEnvSatirleri(raw);
  } catch {
    /* örnek yok veya reddedildi */
  }
  const gh = (k: string): string | undefined => process.env[k] ?? parsed[k];
  const cfg: DeployVpsConfig = {
    vpsHost: (gh('VPS_HOST') ?? '').trim(),
    vpsUser: (gh('VPS_USER') ?? 'deploy').trim(),
    vpsPort: (gh('VPS_PORT') ?? '22').trim(),
    vpsAppDir: (gh('VPS_APP_DIR') ?? '/var/www/pastane-app/app').trim(),
  };
  const id = gh('VPS_SSH_IDENTITY')?.trim();
  if (id) cfg.sshIdentity = id;
  return cfg;
}
