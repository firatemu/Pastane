import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { cancelOrder, fetchOrders } from '@/api/client';
import { ProductGridSkeleton } from '@/components/feedback/skeleton';
import { AppHeader } from '@/components/layout/app-header';
import { SafeScreen } from '@/components/layout/safe-screen';
import { OrderRow } from '@/components/orders/order-row';
import { EmptyState, PrimaryButton, Screen } from '@/components/ui';
import { useAuth } from '@/context/auth-context';
import { typography } from '@/design-tokens';
import { useMobileAdaptivePolling } from '@/hooks/use-mobile-adaptive-polling';
import type { Order } from '@/types';
import { ACTIVE_ORDER_STATUSES, CANCELLABLE_STATUSES } from '@/utils/order-status';
import { colors, radii, spacing } from '@/theme';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function OrdersScreen(): React.JSX.Element {
  const router = useRouter();
  const { auth } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const ordersRef = useRef<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tarih, setTarih] = useState('');

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  const load = useCallback(async () => {
    if (!auth) return;
    setLoading(true);
    setError(null);
    try {
      setOrders(await fetchOrders(tarih ? { tarih } : undefined));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Siparişler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [auth, tarih]);

  const pollTick = useCallback(async () => {
    if (!(auth && ordersRef.current.some((o) => ACTIVE_ORDER_STATUSES.has(o.status)))) return 'ok' as const;
    try {
      setOrders(await fetchOrders(tarih ? { tarih } : undefined));
      return 'ok' as const;
    } catch {
      return 'error' as const;
    }
  }, [auth, tarih]);

  useMobileAdaptivePolling({ poll: pollTick, immediate: false, baseIntervalMs: 25_000, enabled: Boolean(auth) });
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (!auth) {
    return (
      <SafeScreen edges={['top']}>
        <Screen title="Siparişlerim" subtitle="Sipariş geçmişinizi görmek için giriş yapın.">
          <PrimaryButton label="Giriş yap" onPress={() => router.push('/login')} />
        </Screen>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen edges={['top']} padded={false}>
      <AppHeader title="SİPARİŞLER" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl onRefresh={load} refreshing={loading} tintColor={colors.primary} />}
      >
        <View style={styles.pad}>
          <Screen title="Siparişlerim" subtitle="Aktif ve geçmiş siparişleriniz.">
            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Tarih</Text>
              <TextInput
                placeholder="YYYY-AA-GG"
                placeholderTextColor={colors.muted}
                style={styles.dateInput}
                value={tarih}
                onChangeText={setTarih}
              />
              {tarih ? (
                <Pressable onPress={() => setTarih('')}>
                  <Text style={styles.clearFilter}>Temizle</Text>
                </Pressable>
              ) : (
                <Pressable onPress={() => setTarih(todayIso())}>
                  <Text style={styles.clearFilter}>Bugün</Text>
                </Pressable>
              )}
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {loading && !orders.length ? <ProductGridSkeleton /> : null}
            {!orders.length && !loading ? (
              <EmptyState message={tarih ? 'Bu tarihte sipariş bulunamadı.' : 'Henüz siparişiniz yok.'} actionLabel="Vitrine git" onAction={() => router.push('/products')} />
            ) : null}
            {orders.map((order) => (
              <Pressable key={order.id} onPress={() => router.push(`/orders/${order.id}`)}>
                <View style={styles.card}>
                  <OrderRow order={order} />
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
                </View>
              </Pressable>
            ))}
          </Screen>
        </View>
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  cancel: { ...typography.bodySemi, color: colors.error, fontSize: 12, marginTop: spacing.sm },
  card: { marginBottom: spacing.md },
  clearFilter: { ...typography.labelSm, color: colors.primary, textTransform: 'none' },
  dateInput: {
    ...typography.bodyMd,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.md,
    color: colors.onSurface,
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  error: { color: colors.error, fontFamily: typography.bodySemi.fontFamily, marginBottom: spacing.md },
  filterLabel: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginRight: spacing.sm },
  filterRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  pad: { paddingHorizontal: spacing.screenHorizontal },
  scroll: { paddingBottom: 40, paddingTop: spacing.md },
});
