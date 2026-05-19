'use strict';
/* eslint-disable @typescript-eslint/no-require-imports -- This file is intentionally CommonJS because Next.js config files consume it via require(). */
/**
 * Next.js webpack alias for this workspace package. Resolves from this file's directory so
 * `__dirname` is always correct (never a compiled/temp next.config path).
 */
const fs = require('node:fs');
const path = require('node:path');

const pkgRoot = __dirname;

function resolveTrApiErrorsEntry() {
  const distJs = path.join(pkgRoot, 'dist/index.js');
  if (fs.existsSync(distJs)) return distJs;
  return path.join(pkgRoot, 'src/index.ts');
}

/** @param {import('webpack').Configuration} config */
function patchWebpack(config) {
  const target = resolveTrApiErrorsEntry();
  config.resolve ??= {};
  const alias = config.resolve.alias;
  if (Array.isArray(alias)) {
    config.resolve.alias = [...alias, { name: '@pastane/tr-api-errors', alias: target }];
    return;
  }
  config.resolve.alias = {
    ...(alias && typeof alias === 'object' && !Array.isArray(alias) ? alias : {}),
    '@pastane/tr-api-errors': target,
  };
}

module.exports = { resolveTrApiErrorsEntry, patchWebpack };
