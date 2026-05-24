import fs from 'node:fs';
import path from 'node:path';
import type { ExpoConfig } from 'expo/config';

const isProd = process.env.NODE_ENV === 'production';
const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? (isProd ? 'https://api.azem.cloud' : 'http://10.0.2.2:3003');
const webUrl = process.env.EXPO_PUBLIC_WEB_URL ?? (isProd ? 'https://azem.cloud' : 'http://10.0.2.2:3000');

/** Expo config CJS ortamında yüklenir; `import.meta` kullanılamaz. */
const projectRoot = process.cwd();
const googleServicesPath = path.join(projectRoot, 'google-services.json');
const googleServicesConfigured = fs.existsSync(googleServicesPath);

const config: ExpoConfig = {
  name: 'Pasta-Hane',
  slug: 'pasta-hane-mobile',
  owner: 'azemyazilim',
  version: '1.0.1',
  runtimeVersion: {
    policy: 'appVersion',
  },
  updates: {
    enabled: false,
    fallbackToCacheTimeout: 0,
  },
  orientation: 'portrait',
  scheme: 'pastahane',
  userInterfaceStyle: 'light',
  icon: './assets/icon.png',
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'cloud.azem.pastahane',
    buildNumber: '2',
  },
  android: {
    package: 'cloud.azem.pastahane',
    versionCode: 2,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#334537',
    },
    permissions: ['android.permission.INTERNET'],
    ...(googleServicesConfigured ? { googleServicesFile: './google-services.json' } : {}),
  },
  web: {
    bundler: 'metro',
  },
  plugins: ['expo-router', 'expo-font', 'expo-secure-store'],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    apiUrl,
    webUrl,
    eas: {
      projectId: process.env.EAS_PROJECT_ID ?? 'bc619fe4-ae4d-444c-ab92-9b655aacd897',
    },
  },
};

export default config;
