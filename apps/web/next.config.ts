import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

type TrWebpack = {
  resolveTrApiErrorsEntry: () => string;
  patchWebpack: (config: { resolve?: { alias?: unknown } }) => void;
};

/** Next.js / webpack bazen `alias`'ı dizi (`{ name, alias }[]`) olarak tutar; nesne yayılımı leaflet'i sessizce düşürür. */
type WebpackAliasArrayEntry = { name: string | string[]; alias: string | string[] | false };

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resolveTrApiErrorsEntry, patchWebpack } = require('../../packages/tr-api-errors/next-webpack.cjs') as TrWebpack;

/** `apps/web` dizini (`next.config` dosyasıyla aynı klasör). */
const webAppRoot = path.dirname(fileURLToPath(import.meta.url));

function resolveLeafletPackageRoot(projectRoot: string): string | undefined {
  try {
    const req = createRequire(path.join(projectRoot, 'package.json'));
    return path.dirname(req.resolve('leaflet/package.json'));
  } catch {
    return undefined;
  }
}

function entryTargetsLeaflet(entry: unknown): boolean {
  if (!entry || typeof entry !== 'object') return false;
  const raw = (entry as { name?: unknown }).name;
  const names = typeof raw === 'string' ? [raw] : Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : [];
  return names.some((n) => n === 'leaflet' || n.startsWith('leaflet/'));
}

/** Leaflet için webpack çözümlemesi — hem nesne hem dizi `resolve.alias` biçimini destekler. */
function applyLeafletWebpackAliases(
  config: { resolve?: { alias?: unknown } },
  leafletRoot: string,
): void {
  const cssPath = path.join(leafletRoot, 'dist', 'leaflet.css');
  const leafletEntries: WebpackAliasArrayEntry[] = [
    { name: 'leaflet', alias: leafletRoot },
    { name: 'leaflet/dist/leaflet.css', alias: cssPath },
  ];

  config.resolve ??= {};
  const alias = config.resolve.alias;

  if (Array.isArray(alias)) {
    config.resolve.alias = [...alias.filter((e) => !entryTargetsLeaflet(e)), ...leafletEntries];
    return;
  }

  config.resolve.alias = {
    ...(alias && typeof alias === 'object' && !Array.isArray(alias)
      ? (alias as Record<string, string | string[] | false>)
      : {}),
    leaflet: leafletRoot,
    'leaflet/dist/leaflet.css': cssPath,
  };
}

const leafletPackageRoot = resolveLeafletPackageRoot(webAppRoot);

/** Monorepo kökü (`apps/web` içinden iki üst dizin — Docker WORKDIR `/app`). */
const workspaceRoot = path.join(webAppRoot, '..', '..');

/** Docker bind mount ile `apps/web/node_modules` görünmez olduğunda hoisted paketleri (`/app/node_modules`) görmek için. */
function prependWebpackResolveModules(config: { resolve?: { modules?: unknown } }): void {
  config.resolve ??= {};
  const roots = [path.join(workspaceRoot, 'node_modules'), path.join(webAppRoot, 'node_modules')];
  const cur = config.resolve.modules;
  const tail = Array.isArray(cur) ? cur : cur ? [cur as string] : ['node_modules'];
  config.resolve.modules = [...roots, ...tail];
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  outputFileTracingRoot: path.join(webAppRoot, '../..'),
  distDir: process.env.NEXT_DIST_DIR?.trim() || '.next',
  transpilePackages: ['@pastane/tr-api-errors', 'leaflet', 'react-leaflet'],
  turbopack: {
    resolveAlias: {
      '@pastane/tr-api-errors': resolveTrApiErrorsEntry(),
      ...(leafletPackageRoot
        ? {
            leaflet: leafletPackageRoot,
            'leaflet/dist/leaflet.css': path.join(leafletPackageRoot, 'dist', 'leaflet.css'),
          }
        : {}),
    },
  },
  webpack: (config, context) => {
    patchWebpack(config);
    const projectDir =
      context && typeof context === 'object' && 'dir' in context && typeof context.dir === 'string'
        ? context.dir
        : webAppRoot;
    const leafletRoot = resolveLeafletPackageRoot(projectDir) ?? leafletPackageRoot;
    if (leafletRoot) {
      applyLeafletWebpackAliases(config, leafletRoot);
    }
    prependWebpackResolveModules(config);
    return config;
  },
};

export default nextConfig;
