import { Stack } from 'expo-router';
import { useFonts, PlayfairDisplay_600SemiBold, PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import { PlusJakartaSans_400Regular, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppMenuDrawer } from '@/components/layout/app-menu-drawer';
import { AuthProvider } from '@/context/auth-context';
import { CartProvider } from '@/context/cart-context';
import { HeaderMenuProvider } from '@/context/header-menu-context';
import { colors } from '@/theme';
import { PaymentDeepLinkHandler } from './deep-link-handler';

export default function RootLayout(): React.JSX.Element {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.loadingText}>Pasta-Hane hazırlanıyor</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <CartProvider>
          <HeaderMenuProvider>
            <PaymentDeepLinkHandler />
            <AppMenuDrawer />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="login" options={{ presentation: 'modal' }} />
              <Stack.Screen name="register" options={{ presentation: 'modal' }} />
              <Stack.Screen name="product/[slug]" />
              <Stack.Screen name="checkout" />
              <Stack.Screen name="payment-result" />
              <Stack.Screen name="profile" />
              <Stack.Screen name="notifications" />
              <Stack.Screen name="orders/[id]" />
              <Stack.Screen name="addresses/index" />
              <Stack.Screen name="addresses/new" />
              <Stack.Screen name="addresses/[id]" />
            </Stack>
          </HeaderMenuProvider>
        </CartProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', backgroundColor: colors.background, flex: 1, justifyContent: 'center' },
  loadingText: { color: colors.chocolate, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 12 },
});
