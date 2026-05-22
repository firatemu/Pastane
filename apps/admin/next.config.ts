import path from 'node:path';
import type { NextConfig } from 'next';

type TrWebpack = {
  resolveTrApiErrorsEntry: () => string;
  patchWebpack: (config: { resolve?: { alias?: unknown } }) => void;
};

// Path is relative to this file (always under `apps/admin`). Resolver lives inside the package so its `__dirname` never breaks.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resolveTrApiErrorsEntry, patchWebpack } = require('../../packages/tr-api-errors/next-webpack.cjs') as TrWebpack;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../..'),
  /** Override when host `.next` has root-owned files (e.g. old Docker runs). Each app cwd → separate folder. */
  distDir: process.env.NEXT_DIST_DIR?.trim() || '.next',
  transpilePackages: ['@pastane/tr-api-errors'],
  turbopack: {
    resolveAlias: {
      '@pastane/tr-api-errors': resolveTrApiErrorsEntry(),
    },
  },
  webpack: (config) => {
    patchWebpack(config);
    return config;
  },
  experimental: {
    middlewareClientMaxBodySize: '30mb',
  },
  async redirects() {
    /** Browsers still request /favicon.ico; serve the app icon at /icon.svg. */
    return [{ source: '/favicon.ico', destination: '/icon.svg', permanent: false }];
  },
};

export default nextConfig;
