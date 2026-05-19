import path from 'node:path';
import type { NextConfig } from 'next';

type TrWebpack = {
  resolveTrApiErrorsEntry: () => string;
  patchWebpack: (config: { resolve?: { alias?: unknown } }) => void;
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resolveTrApiErrorsEntry, patchWebpack } = require('../../packages/tr-api-errors/next-webpack.cjs') as TrWebpack;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../..'),
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
};

export default nextConfig;
