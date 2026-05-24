import { colors, spacing } from '@/theme';

export const fonts = {
  display: 'PlayfairDisplay_700Bold',
  displaySemi: 'PlayfairDisplay_600SemiBold',
  body: 'PlusJakartaSans_400Regular',
  bodySemi: 'PlusJakartaSans_600SemiBold',
  bodyBold: 'PlusJakartaSans_700Bold',
} as const;

export const typography = {
  displayLg: { fontFamily: fonts.display, fontSize: 32, lineHeight: 40, letterSpacing: -0.5 },
  headlineMd: { fontFamily: fonts.displaySemi, fontSize: 24, lineHeight: 32 },
  headlineSm: { fontFamily: fonts.displaySemi, fontSize: 20, lineHeight: 28 },
  bodyLg: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24 },
  bodyMd: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21 },
  body: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21 },
  bodySemi: { fontFamily: fonts.bodySemi, fontSize: 14, lineHeight: 21 },
  bodyBold: { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 21 },
  labelLg: { fontFamily: fonts.bodySemi, fontSize: 12, lineHeight: 16, letterSpacing: 1.2, textTransform: 'uppercase' as const },
  labelSm: { fontFamily: fonts.bodySemi, fontSize: 10, lineHeight: 14, letterSpacing: 1, textTransform: 'uppercase' as const },
  price: { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 20 },
};

export const layout = {
  headerHeight: 64,
  tabBarHeight: 80,
  stickySummaryBottomOffset: 88,
  maxContentWidth: 480,
  touchTargetMin: 44,
  screenPadding: spacing.screenHorizontal,
};

export const tabBar = {
  activePillBg: `${colors.secondaryContainer}33`,
  borderColor: `${colors.outlineVariant}4D`,
  iconSize: 24,
  labelSize: 10,
};
