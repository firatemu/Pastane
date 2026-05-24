import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

/** Monorepo root (pastane-platform/). */
export const REPO_ROOT = path.resolve(here, '..', '..');
