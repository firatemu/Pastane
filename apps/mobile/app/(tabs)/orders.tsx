import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cancelOrder, fetchOrders } from '@/api/client';
import { EmptyState, PrimaryButton, Screen } from '@/components/ui';
import { useAuth } from '@/context/auth-context';
import type { Order } from '@/types';
import { formatDate, formatTry } from '@/utils/format';
import { CANCELLABLE_STATUSES, statusLabel } from '@/utils/order-status';
import { colors, radii, shadow, spacing } from '@/theme';

export default function OrdersScreen(): React.JSX.Element {
  const router = useRouter();
  const { auth } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!auth) return;
    setLoading(true);
    setError(null);
    try {
      setOrders(await fetchOrders());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Siparişler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (!auth) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.pad}>
          <Screen title="Siparişlerim" subtitle="Sipariş geçmişinizi görmek için giriş yapın.">
            <PrimaryButton label="Giriş yap" onPress={() => router.push('/login')} />
          </Screen>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />}>
        <Screen title="Siparişlerim" subtitle="Aktif ve geçmiş siparişleriniz.">
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {loading && !orders.length ? <ActivityIndicator color={colors.accent} /> : null}
          {!orders.length && !loading ? <EmptyState message="Henüz siparişiniz yok." /> : null}
          {orders.map((order) => (
            <Pressable key={order.id} style={styles.card} onPress={() => router.push(`/orders/${order.id}`)}>
              <View style={styles.head}>
                <Text style={styles.no}>{order.orderNumber}</Text>
                <Text style={styles.status}>{statusLabel(order.status)}</Text>
              </View>
              <Text style={styles.meta}>{formatDate(order.createdAt)} · {formatTry(order.grandTotal)}</Text>
              <Text style={styles.meta}>{order.deliveryType === 'HOME_DELIVERY' ? 'Adrese teslim' : 'Mağazadan teslim'}</Text>
              {CANCELLABLE_STATUSES.has(order.status) ? (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation?.();
                    void cancelOrder(order.id).then(load).catch(() => setError('Sipariş iptal edilemedi.'));
                  }}
                >
                  <Text style={styles.cancel}>İptal et</Text>
                </Pressable>
              ) : null}
            </Pressable>
          ))}
        </Screen>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  cancel: { color: colors.error, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, marginTop: spacing.sm },
  card: { ...shadow, backgroundColor: colors.surface, borderRadius: radii.xl, marginBottom: spacing.md, padding: spacing.lg },
  error: { color: colors.error, fontFamily: 'PlusJakartaSans_600SemiBold', marginBottom: spacing.md },
  head: { flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' },
  meta: { color: colors.textMuted, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 13, marginTop: 6 },
  no: { color: colors.text, fontFamily: 'PlusJakartaSans_700Bold' },
  pad: { flex: 1, padding: spacing.xl },
  safe: { backgroundColor: colors.background, flex: 1 },
  scroll: { padding: spacing.xl, paddingBottom: 40 },
  status: { color: colors.accent, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12 },
});
