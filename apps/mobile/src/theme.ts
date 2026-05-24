import { colors as webColors } from '../theme/tokens';

/** Mobile palette sourced from `apps/web/tailwind.config.ts`. */
export const colors = {
  accent: webColors.primary,
  background: webColors.background,
  chocolate: webColors.ink,
  error: webColors.error,
  errorContainer: '#ffdad6',
  gold: webColors.gold,
  honey: webColors.honey,
  muted: webColors.muted,
  onError: '#ffffff',
  onPrimary: '#ffffff',
  onSecondary: '#ffffff',
  onSecondaryContainer: webColors.secondary,
  onSurface: webColors.ink,
  onSurfaceVariant: webColors.muted,
  outline: webColors.outline,
  outlineVariant: webColors['outline-soft'],
  primary: webColors.primary,
  primaryContainer: webColors['primary-container'],
  primaryFixed: webColors['primary-fixed'],
  secondary: webColors.secondary,
  secondaryContainer: webColors.honey,
  surface: webColors.surface,
  surfaceBright: webColors.background,
  surfaceContainer: webColors['surface-container'],
  surfaceContainerHigh: webColors['surface-high'],
  surfaceContainerHighest: webColors['surface-highest'],
  surfaceContainerLow: webColors['surface-low'],
  surfaceContainerLowest: webColors['surface-lowest'],
  surfaceLow: webColors['surface-low'],
  surfaceHigh: webColors['surface-high'],
  text: webColors.ink,
  textMuted: webColors.muted,
  inversePrimary: '#b7ccb9',
  inverseSurface: '#2f312f',
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  section: 32,
  screenHorizontal: 16,
};

export const shadow = {
  shadowColor: colors.chocolate,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 16,
  elevation: 4,
};

export const shadowSoft = {
  shadowColor: colors.chocolate,
  shadowOffset: { width: 0, height: -4 },
  shadowOpacity: 0.06,
  shadowRadius: 20,
  elevation: 8,
};
