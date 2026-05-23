import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState, PrimaryButton, Screen } from '@/components/ui';
import { useAuth } from '@/context/auth-context';
import { useCart } from '@/context/cart-context';
import { formatTry } from '@/utils/format';
import { productLabel } from '@/utils/product-label';
import { productImageUrl } from '@/utils/product-image';
import { colors, radii, shadow, spacing } from '@/theme';

export default function CartScreen(): React.JSX.Element {
  const router = useRouter();
  const { auth } = useAuth();
  const { items, loading, updateQuantity, removeItem } = useCart();
  const [busyId, setBusyId] = useState<string | null>(null);

  const total = items.reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0);

  if (loading && !items.length) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Screen title="Sepetim" subtitle="Seçiminizi gözden geçirin.">
          {!auth ? (
            <>
              <EmptyState message="Sepetinizi görmek için giriş yapın." />
              <PrimaryButton label="Giriş yap" onPress={() => router.push('/login')} />
            </>
          ) : !items.length ? (
            <EmptyState message="Sepetiniz boş." />
          ) : (
            <>
              {items.map((item) => (
                <View key={item.id} style={styles.row}>
                  <Image source={{ uri: productImageUrl(item.product) }} style={styles.thumb} />
                  <View style={styles.body}>
                    <Text style={styles.name}>{productLabel(item.product)}</Text>
                    <Text style={styles.meta}>{formatTry(item.unitPrice)} · adet</Text>
                    <View style={styles.qtyRow}>
                      <Pressable
                        style={styles.qtyBtn}
                        disabled={busyId === item.id}
                        onPress={() => {
                          setBusyId(item.id);
                          void updateQuantity(item.id, item.quantity - 1).finally(() => setBusyId(null));
                        }}
                      >
                        <Text style={styles.qtyBtnText}>-</Text>
                      </Pressable>
                      <Text style={styles.qty}>{item.quantity}</Text>
                      <Pressable
                        style={styles.qtyBtn}
                        disabled={busyId === item.id}
                        onPress={() => {
                          setBusyId(item.id);
                          void updateQuantity(item.id, item.quantity + 1).finally(() => setBusyId(null));
                        }}
                      >
                        <Text style={styles.qtyBtnText}>+</Text>
                      </Pressable>
                      <Pressable onPress={() => void removeItem(item.id)} style={styles.remove}>
                        <Text style={styles.removeText}>Sil</Text>
                      </Pressable>
                    </View>
                  </View>
                  <Text style={styles.lineTotal}>{formatTry(Number(item.unitPrice) * item.quantity)}</Text>
                </View>
              ))}
              <View style={styles.summary}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Ara toplam</Text>
                  <Text style={styles.summaryValue}>{formatTry(total)}</Text>
                </View>
                <PrimaryButton label="Ödemeye geç" onPress={() => router.push('/checkout')} />
              </View>
            </>
          )}
        </Screen>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1 },
  lineTotal: { color: colors.accent, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14 },
  meta: { color: colors.textMuted, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 12, marginTop: 4 },
  name: { color: colors.chocolate, fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 18 },
  qty: { fontFamily: 'PlusJakartaSans_700Bold', minWidth: 24, textAlign: 'center' },
  qtyBtn: { alignItems: 'center', backgroundColor: colors.surfaceLow, borderRadius: radii.pill, height: 32, justifyContent: 'center', width: 32 },
  qtyBtnText: { color: colors.chocolate, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16 },
  qtyRow: { alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: spacing.sm },
  remove: { marginLeft: 'auto' },
  removeText: { color: colors.error, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12 },
  row: { ...shadow, alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.xl, flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md, padding: spacing.md },
  safe: { backgroundColor: colors.background, flex: 1 },
  scroll: { padding: spacing.xl, paddingBottom: 32 },
  summary: { backgroundColor: colors.chocolate, borderRadius: radii.xl, marginTop: spacing.lg, padding: spacing.xl },
  summaryLabel: { color: 'rgba(255,248,245,0.72)', fontFamily: 'PlusJakartaSans_400Regular' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.lg },
  summaryValue: { color: colors.background, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16 },
  thumb: { borderRadius: radii.md, height: 72, width: 72 },
});
