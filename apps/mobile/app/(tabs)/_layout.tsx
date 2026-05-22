import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useCart } from '@/context/cart-context';
import { colors } from '@/theme';

function TabLabel({ label, focused }: { label: string; focused: boolean }): React.JSX.Element {
  return <Text style={{ color: focused ? colors.accent : colors.textMuted, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10 }}>{label}</Text>;
}

export default function TabsLayout(): React.JSX.Element {
  const { count } = useCart();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: 'rgba(198,199,192,0.35)' },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Vitrin', tabBarLabel: ({ focused }) => <TabLabel label="Vitrin" focused={focused} /> }} />
      <Tabs.Screen name="products" options={{ title: 'Ürünler', tabBarLabel: ({ focused }) => <TabLabel label="Ürünler" focused={focused} /> }} />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Sepet',
          tabBarLabel: ({ focused }) => <TabLabel label={count ? `Sepet (${count})` : 'Sepet'} focused={focused} />,
        }}
      />
      <Tabs.Screen name="account" options={{ title: 'Hesap', tabBarLabel: ({ focused }) => <TabLabel label="Hesap" focused={focused} /> }} />
    </Tabs>
  );
}
