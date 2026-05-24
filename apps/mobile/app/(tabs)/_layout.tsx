import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform, StyleSheet, Text, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tabBar } from '@/design-tokens';
import { useCart } from '@/context/cart-context';
import { spacing } from '@/theme';

function TabLabel({ label, focused }: { label: string; focused: boolean }): React.JSX.Element {
  return (
    <Text
      style={{
        color: focused ? tabBar.activeTint : tabBar.inactiveTint,
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: tabBar.labelSize,
        letterSpacing: 0.8,
        marginTop: 2,
        textTransform: 'uppercase',
      }}
    >
      {label}
    </Text>
  );
}

function TabIcon({
  name,
  focused,
  color,
  size,
}: {
  name: keyof typeof MaterialCommunityIcons.glyphMap;
  focused: boolean;
  color: ColorValue;
  size: number;
}): React.JSX.Element {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <MaterialCommunityIcons color={String(color)} name={name} size={size} />
    </View>
  );
}

export default function TabsLayout(): React.JSX.Element {
  const { count } = useCart();
  const insets = useSafeAreaInsets();

  const tabIcon =
    (name: keyof typeof MaterialCommunityIcons.glyphMap, focusedName?: keyof typeof MaterialCommunityIcons.glyphMap) =>
    ({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) =>
      TabIcon({ name: focused && focusedName ? focusedName : name, focused, color, size });

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: tabBar.background,
          borderTopColor: tabBar.borderColor,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 64 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 0),
          paddingTop: 8,
          ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.2, shadowRadius: 16 },
            android: { elevation: 16 },
          }),
        },
        tabBarActiveTintColor: tabBar.activeTint,
        tabBarInactiveTintColor: tabBar.inactiveTint,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Ana Sayfa', tabBarIcon: tabIcon('home-outline', 'home'), tabBarLabel: ({ focused }) => <TabLabel label="Ana Sayfa" focused={focused} /> }} />
      <Tabs.Screen name="products" options={{ title: 'Vitrin', tabBarIcon: tabIcon('storefront-outline', 'storefront'), tabBarLabel: ({ focused }) => <TabLabel label="Vitrin" focused={focused} /> }} />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Sepet',
          tabBarBadge: count ? count : undefined,
          tabBarBadgeStyle: { backgroundColor: tabBar.badgeBg, color: tabBar.badgeText, fontSize: 10 },
          tabBarIcon: tabIcon('shopping-outline', 'shopping'),
          tabBarLabel: ({ focused }) => <TabLabel label="Sepet" focused={focused} />,
        }}
      />
      <Tabs.Screen name="orders" options={{ title: 'Siparişler', tabBarIcon: tabIcon('receipt-text-outline', 'receipt-text'), tabBarLabel: ({ focused }) => <TabLabel label="Siparişler" focused={focused} /> }} />
      <Tabs.Screen name="account" options={{ title: 'Profil', tabBarIcon: tabIcon('account-outline', 'account'), tabBarLabel: ({ focused }) => <TabLabel label="Profil" focused={focused} /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: { alignItems: 'center', borderRadius: 14, justifyContent: 'center', minHeight: 36, minWidth: 48, paddingHorizontal: spacing.sm },
  iconWrapActive: { backgroundColor: tabBar.activePillBg },
});
