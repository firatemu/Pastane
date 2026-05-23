import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text, type ColorValue } from 'react-native';
import { useCart } from '@/context/cart-context';
import { colors } from '@/theme';

function TabLabel({ label, focused }: { label: string; focused: boolean }): React.JSX.Element {
  return <Text style={{ color: focused ? colors.accent : colors.textMuted, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10 }}>{label}</Text>;
}

export default function TabsLayout(): React.JSX.Element {
  const { count } = useCart();
  const tabIcon =
    (name: keyof typeof MaterialCommunityIcons.glyphMap) =>
    ({ color, size }: { color: ColorValue; size: number }) => <MaterialCommunityIcons name={name} color={String(color)} size={size} />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: 'rgba(198,199,192,0.35)' },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Ana Sayfa', tabBarIcon: tabIcon('home-outline'), tabBarLabel: ({ focused }) => <TabLabel label="Ana Sayfa" focused={focused} /> }} />
      <Tabs.Screen name="products" options={{ title: 'Kategoriler', tabBarIcon: tabIcon('view-grid-outline'), tabBarLabel: ({ focused }) => <TabLabel label="Kategoriler" focused={focused} /> }} />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Sepet',
          tabBarBadge: count ? count : undefined,
          tabBarIcon: tabIcon('cart-outline'),
          tabBarLabel: ({ focused }) => <TabLabel label="Sepet" focused={focused} />,
        }}
      />
      <Tabs.Screen name="orders" options={{ title: 'Siparişler', tabBarIcon: tabIcon('receipt-text-outline'), tabBarLabel: ({ focused }) => <TabLabel label="Siparişler" focused={focused} /> }} />
      <Tabs.Screen name="account" options={{ title: 'Profil', tabBarIcon: tabIcon('account-outline'), tabBarLabel: ({ focused }) => <TabLabel label="Profil" focused={focused} /> }} />
    </Tabs>
  );
}
