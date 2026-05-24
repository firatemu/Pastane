/* eslint-disable @typescript-eslint/no-require-declarations -- Metro CJS yapılandırması */
const { getDefaultConfig } = require('expo/metro-config');

/**
 * Expo SDK 52+ monorepodaki workspace çözümlemesini `@expo/metro-config` otomatik yapar.
 * Manuel `watchFolders` / `nodeModulesPaths` EAS `export:embed` sırasında hatalara yol açabildiği için kaldırıldı.
 * @see https://docs.expo.dev/guides/monorepos/
 *
 * @type {import('expo/metro-config').MetroConfig}
 */
module.exports = getDefaultConfig(__dirname);
