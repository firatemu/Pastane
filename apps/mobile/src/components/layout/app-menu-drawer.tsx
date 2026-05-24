import { useRouter } from 'expo-router';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/auth-context';
import { useHeaderMenu } from '@/context/header-menu-context';
import { headerBar, typography } from '@/design-tokens';
import { colors, radii, spacing } from '@/theme';

type MenuItem = {
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  href: string;
  requiresAuth?: boolean;
};

const MENU_ITEMS: MenuItem[] = [
  { label: 'Ana Sayfa', icon: 'home-outline', href: '/(tabs)' },
  { label: 'Vitrin', icon: 'storefront-outline', href: '/(tabs)/products' },
  { label: 'Sepet', icon: 'shopping-outline', href: '/(tabs)/cart' },
  { label: 'Siparişler', icon: 'receipt-text-outline', href: '/(tabs)/orders', requiresAuth: true },
  { label: 'Hesabım', icon: 'account-outline', href: '/(tabs)/account', requiresAuth: true },
  { label: 'Bildirimler', icon: 'bell-outline', href: '/notifications', requiresAuth: true },
  { label: 'Adreslerim', icon: 'map-marker-outline', href: '/addresses', requiresAuth: true },
];

export function AppMenuDrawer(): React.JSX.Element {
  const { visible, closeMenu } = useHeaderMenu();
  const { auth, logout } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  function navigate(href: string, requiresAuth?: boolean): void {
    closeMenu();
    if (requiresAuth && !auth) {
      router.push('/login');
      return;
    }
    router.push(href as never);
  }

  return (
    <Modal animationType="fade" onRequestClose={closeMenu} transparent visible={visible}>
      <View style={styles.overlay}>
        <Pressable accessibilityLabel="Menüyü kapat" onPress={closeMenu} style={styles.backdrop} />
        <View style={[styles.panel, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.md }]}>
          <View style={styles.panelHead}>
            <Text style={styles.brand}>Pasta-Hane</Text>
            <Pressable accessibilityLabel="Kapat" hitSlop={8} onPress={closeMenu} style={styles.closeBtn}>
              <MaterialCommunityIcons color={headerBar.iconColor} name="close" size={24} />
            </Pressable>
          </View>
          <Text style={styles.eyebrow}>Menü</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {MENU_ITEMS.map((item) => (
              <Pressable key={item.href} onPress={() => navigate(item.href, item.requiresAuth)} style={styles.row}>
                <MaterialCommunityIcons color={headerBar.iconColor} name={item.icon} size={22} />
                <Text style={styles.rowLabel}>{item.label}</Text>
              </Pressable>
            ))}
            {auth ? (
              <Pressable
                onPress={() => {
                  closeMenu();
                  void logout();
                }}
                style={[styles.row, styles.rowDanger]}
              >
                <MaterialCommunityIcons color={colors.error} name="logout" size={22} />
                <Text style={[styles.rowLabel, styles.rowLabelDanger]}>Çıkış yap</Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => navigate('/login')} style={styles.row}>
                <MaterialCommunityIcons color={headerBar.iconColor} name="login" size={22} />
                <Text style={styles.rowLabel}>Giriş yap</Text>
              </Pressable>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill },
  brand: { ...typography.headlineSm, color: headerBar.titleColor, fontSize: 22 },
  closeBtn: {
    alignItems: 'center',
    backgroundColor: headerBar.iconBtnBg,
    borderRadius: radii.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  eyebrow: { ...typography.labelSm, color: 'rgba(255,255,255,0.65)', marginBottom: spacing.md, textTransform: 'none' },
  overlay: { flex: 1, flexDirection: 'row' },
  panel: {
    backgroundColor: headerBar.background,
    borderRightColor: headerBar.accentLine,
    borderRightWidth: 3,
    maxWidth: 320,
    paddingHorizontal: spacing.lg,
    width: '82%',
  },
  panelHead: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  row: {
    alignItems: 'center',
    borderRadius: radii.lg,
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  rowDanger: { backgroundColor: 'rgba(255,255,255,0.06)' },
  rowLabel: { ...typography.bodySemi, color: headerBar.titleColor, fontSize: 15 },
  rowLabelDanger: { color: colors.error },
});
