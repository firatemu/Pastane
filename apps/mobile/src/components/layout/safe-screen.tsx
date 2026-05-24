import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { colors, spacing } from '@/theme';

export function SafeScreen({
  children,
  edges = ['top'],
  style,
  padded = true,
}: {
  children: ReactNode;
  edges?: Edge[];
  style?: ViewStyle;
  padded?: boolean;
}): React.JSX.Element {
  return (
    <SafeAreaView edges={edges} style={[styles.safe, style]}>
      <View style={padded ? styles.pad : undefined}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pad: { flex: 1, paddingHorizontal: spacing.screenHorizontal },
  safe: { backgroundColor: colors.background, flex: 1 },
});
