import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { layout, typography } from '@/design-tokens';
import { colors, spacing } from '@/theme';

type AppHeaderProps = {
  title?: string;
  showMenu?: boolean;
  showSearch?: boolean;
  showBack?: boolean;
  onMenuPress?: () => void;
  onSearchPress?: () => void;
  onBackPress?: () => void;
  rightSlot?: React.ReactNode;
};

export function AppHeader({
  title = 'PASTA-HANE',
  showMenu = false,
  showSearch = true,
  showBack = false,
  onMenuPress,
  onSearchPress,
  onBackPress,
  rightSlot,
}: AppHeaderProps): React.JSX.Element {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      <View style={styles.row}>
        {showBack ? (
          <Pressable accessibilityLabel="Geri" hitSlop={8} onPress={onBackPress} style={styles.iconBtn}>
            <MaterialCommunityIcons color={colors.primary} name="arrow-left" size={24} />
          </Pressable>
        ) : showMenu ? (
          <Pressable accessibilityLabel="Menü" hitSlop={8} onPress={onMenuPress} style={styles.iconBtn}>
            <MaterialCommunityIcons color={colors.primary} name="menu" size={24} />
          </Pressable>
        ) : (
          <View style={styles.iconBtn} />
        )}
        <Text numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        {rightSlot ?? (
          showSearch ? (
            <Pressable accessibilityLabel="Ara" hitSlop={8} onPress={onSearchPress} style={styles.iconBtn}>
              <MaterialCommunityIcons color={colors.primary} name="magnify" size={24} />
            </Pressable>
          ) : (
            <View style={styles.iconBtn} />
          )
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  iconBtn: { alignItems: 'center', height: layout.touchTargetMin, justifyContent: 'center', width: layout.touchTargetMin },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    height: layout.headerHeight,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenHorizontal,
  },
  title: {
    ...typography.labelLg,
    color: colors.primary,
    flex: 1,
    fontSize: 14,
    letterSpacing: 2,
    textAlign: 'center',
  },
  wrap: { backgroundColor: colors.surface, borderBottomColor: `${colors.outlineVariant}40`, borderBottomWidth: StyleSheet.hairlineWidth },
});
