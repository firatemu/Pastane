import { spawn } from 'node:child_process';
import path from 'node:path';

import { REPO_ROOT } from './repo-root.ts';

export interface RunOpts {
  cwd?: string | undefined;
  env?: NodeJS.ProcessEnv | undefined;
  /** stderr taşınımı için */
  quiet?: boolean | undefined;
}

export function runPnpm(scriptArgs: readonly string[], opts: RunOpts = {}): Promise<number> {
  const cwd = opts.cwd ?? REPO_ROOT;
  const cmd = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
  return runProcess(cmd, scriptArgs, { ...opts, cwd });
}

export function runProcess(
  command: string,
  args: readonly string[],
  opts: RunOpts & { cwd?: string } = {},
): Promise<number> {
  const cwd = opts.cwd ?? REPO_ROOT;
  return new Promise((resolve) => {
    const child = spawn(command, [...args], {
      cwd: path.normalize(cwd),
      env: { ...process.env, ...opts.env },
      stdio: opts.quiet ? 'pipe' : 'inherit',
      shell: process.platform === 'win32',
    });
    child.on('error', () => resolve(1));
    child.on('close', (code) => resolve(code ?? 1));
  });
}

/** Bash ile script çalıştırır (Git Bash / WSL / Linux/macOS). */
export async function runBash(relScript: string, args: readonly string[] = [], opts: RunOpts = {}): Promise<number> {
  const scriptPath = path.join(REPO_ROOT, relScript);
  const cwd = opts.cwd ?? REPO_ROOT;
  return runProcess('bash', [scriptPath, ...args], { ...opts, cwd });
}
