import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchOrder, fetchPayments } from '@/api/client';
import { PrimaryButton, Screen } from '@/components/ui';
import type { Order, Payment } from '@/types';
import { formatTry } from '@/utils/format';
import { statusLabel } from '@/utils/order-status';
import { colors, radii, spacing } from '@/theme';

export default function PaymentResultScreen(): React.JSX.Element {
  const router = useRouter();
  const { orderId, status } = useLocalSearchParams<{ orderId?: string; status?: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(): Promise<void> {
    if (!orderId) {
      setError('Sipariş bilgisi bulunamadı.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [nextOrder, nextPayments] = await Promise.all([fetchOrder(orderId), fetchPayments(orderId).catch(() => [])]);
      setOrder(nextOrder);
      setPayment(nextPayments[0] ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ödeme sonucu alınamadı.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [orderId]);

  const success = order?.status === 'CONFIRMED' || payment?.status === 'SUCCESS' || status === 'success';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Screen title={success ? 'Ödeme başarılı' : 'Ödeme durumu'} subtitle={success ? 'Siparişiniz alındı.' : 'Ödeme sonucunu kontrol edin.'}>
          {loading ? <ActivityIndicator color={colors.accent} /> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {order ? (
            <View style={styles.card}>
              <Text style={styles.orderNo}>{order.orderNumber}</Text>
              <Text style={styles.meta}>Sipariş durumu: {statusLabel(order.status)}</Text>
              <Text style={styles.meta}>Ödeme durumu: {payment?.status ?? 'Bekleniyor'}</Text>
              <Text style={styles.total}>{formatTry(order.grandTotal)}</Text>
            </View>
          ) : null}
          <PrimaryButton label="Sipariş detayına git" onPress={() => orderId && router.replace(`/orders/${orderId}`)} disabled={!orderId} />
          <PrimaryButton label="Ödemeyi tekrar kontrol et" onPress={() => void load()} busy={loading} disabled={!orderId} />
        </Screen>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radii.xl, marginBottom: spacing.lg, padding: spacing.lg },
  error: { color: colors.error, fontFamily: 'PlusJakartaSans_600SemiBold', marginBottom: spacing.md },
  meta: { color: colors.textMuted, fontFamily: 'PlusJakartaSans_400Regular', marginTop: spacing.sm },
  orderNo: { color: colors.primary, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 18 },
  safe: { backgroundColor: colors.background, flex: 1 },
  scroll: { padding: spacing.xl, paddingBottom: 40 },
  total: { color: colors.accent, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 24, marginTop: spacing.lg },
});
