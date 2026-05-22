import type { ExpoConfig } from 'expo/config';

const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3003';
const webUrl = process.env.EXPO_PUBLIC_WEB_URL ?? 'http://localhost:3000';

const config: ExpoConfig = {
  name: 'Pasta-Hane',
  slug: 'pasta-hane-mobile',
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
  plugins: ['expo-router'],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    apiUrl,
    webUrl,
    eas: {
      projectId: process.env.EAS_PROJECT_ID ?? '',
    },
  },
};

export default config;
