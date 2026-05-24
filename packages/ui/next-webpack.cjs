'use strict';
/* eslint-disable @typescript-eslint/no-require-imports -- Next.js config dosyaları require() ile tüketir. */
/**
 * Next.js webpack/turbopack alias for @pastane/ui.
 * `dist` yoksa (Docker dev, taze clone) doğrudan `src` üzerinden transpile edilir.
 */
const fs = require('node:fs');
const path = require('node:path');

const pkgRoot = __dirname;

function resolveUiEntry() {
  const distJs = path.join(pkgRoot, 'dist/index.js');
  if (fs.existsSync(distJs)) return distJs;
  return path.join(pkgRoot, 'src/index.ts');
}

/** @param {import('webpack').Configuration} config */
function patchWebpack(config) {
  const target = resolveUiEntry();
  config.resolve ??= {};
  const alias = config.resolve.alias;
  if (Array.isArray(alias)) {
    config.resolve.alias = [...alias, { name: '@pastane/ui', alias: target }];
    return;
  }
  config.resolve.alias = {
    ...(alias && typeof alias === 'object' && !Array.isArray(alias) ? alias : {}),
    '@pastane/ui': target,
  };
}

module.exports = { resolveUiEntry, patchWebpack };
