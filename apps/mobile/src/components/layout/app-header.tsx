import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderMenuOptional } from '@/context/header-menu-context';
import { headerBar, layout, typography } from '@/design-tokens';
import { radii, spacing } from '@/theme';

type AppHeaderProps = {
  title?: string;
  showMenu?: boolean;
  showSearch?: boolean;
  showBack?: boolean;
  showBrand?: boolean;
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
  showBrand = false,
  onMenuPress,
  onSearchPress,
  onBackPress,
  rightSlot,
}: AppHeaderProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const menu = useHeaderMenuOptional();

  const handleMenuPress = (): void => {
    if (onMenuPress) {
      onMenuPress();
      return;
    }
    menu?.openMenu();
  };

  const iconButton = (node: React.ReactNode, onPress?: () => void, label?: string) =>
    onPress ? (
      <Pressable accessibilityLabel={label} hitSlop={8} onPress={onPress} style={styles.iconBtn}>
        {node}
      </Pressable>
    ) : (
      <View style={styles.iconBtn}>{node}</View>
    );

  const leftControl = showBack
    ? iconButton(
        <MaterialCommunityIcons color={headerBar.iconColor} name="arrow-left" size={22} />,
        onBackPress,
        'Geri',
      )
    : showMenu
      ? iconButton(
          <MaterialCommunityIcons color={headerBar.iconColor} name="menu" size={22} />,
          handleMenuPress,
          'Menü',
        )
      : iconButton(null);

  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      <View style={styles.accentLine} />
      <View style={styles.row}>
        {leftControl}
        <View style={styles.titleBlock}>
          {showBrand ? <Text style={styles.brand}>Pasta-Hane</Text> : null}
          <Text numberOfLines={1} style={styles.title}>
            {title}
          </Text>
        </View>
        {rightSlot ??
          (showSearch
            ? iconButton(
                <MaterialCommunityIcons color={headerBar.iconColor} name="magnify" size={22} />,
                onSearchPress,
                'Ara',
              )
            : iconButton(null))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  accentLine: { backgroundColor: headerBar.accentLine, height: 2, width: '100%' },
  brand: {
    color: headerBar.brandColor,
    fontFamily: typography.headlineSm.fontFamily,
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  iconBtn: {
    alignItems: 'center',
    backgroundColor: headerBar.iconBtnBg,
    borderRadius: radii.pill,
    height: layout.touchTargetMin,
    justifyContent: 'center',
    width: layout.touchTargetMin,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    height: layout.headerHeight,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenHorizontal,
  },
  title: {
    ...typography.labelLg,
    color: headerBar.titleColor,
    fontSize: 13,
    letterSpacing: 2,
    textAlign: 'center',
  },
  titleBlock: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingHorizontal: spacing.sm },
  wrap: {
    backgroundColor: headerBar.background,
    borderBottomColor: headerBar.borderColor,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
