import type { ExpoConfig } from 'expo/config';

const isProd = process.env.NODE_ENV === 'production';
const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? (isProd ? 'https://api.azem.cloud' : 'http://10.0.2.2:3003');
const webUrl = process.env.EXPO_PUBLIC_WEB_URL ?? (isProd ? 'https://azem.cloud' : 'http://10.0.2.2:3000');

const config: ExpoConfig = {
  name: 'Pasta-Hane',
  slug: 'pasta-hane-mobile',
  owner: 'azemyazilim',
  version: '1.0.0',
  orientation: 'portrait',
  scheme: 'pastahane',
  userInterfaceStyle: 'light',
  icon: './assets/icon.png',
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'cloud.azem.pastahane',
    buildNumber: '1',
  },
  android: {
    package: 'cloud.azem.pastahane',
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#fff8f5',
    },
  },
  web: {
    bundler: 'metro',
  },
  plugins: ['expo-router', 'expo-font'],
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
