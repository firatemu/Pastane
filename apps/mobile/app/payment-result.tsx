import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { fetchOrder, fetchPayments } from '@/api/client';
import { ProductGridSkeleton } from '@/components/feedback/skeleton';
import { SafeScreen } from '@/components/layout/safe-screen';
import { PrimaryButton, Screen, SecondaryButton } from '@/components/ui';
import { typography } from '@/design-tokens';
import type { Order, Payment } from '@/types';
import { formatTry } from '@/utils/format';
import { hapticError, hapticSuccess } from '@/utils/haptics';
import { paymentStatusLabel, statusLabel } from '@/utils/order-status';
import { colors, radii, spacing } from '@/theme';

export default function PaymentResultScreen(): React.JSX.Element {
  const router = useRouter();
  const { orderId, status } = useLocalSearchParams<{ orderId?: string; status?: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hapticDone, setHapticDone] = useState(false);

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

  const explicitFail =
    status === 'failure' ||
    status === 'failed' ||
    payment?.status === 'FAILED' ||
    order?.status === 'CANCELLED';

  const success =
    !explicitFail &&
    (order?.status === 'CONFIRMED' || payment?.status === 'SUCCESS' || status === 'success');

  useEffect(() => {
    if (loading || hapticDone || !order) return;
    if (success) void hapticSuccess().then(() => setHapticDone(true));
    else if (explicitFail) void hapticError().then(() => setHapticDone(true));
  }, [loading, order, success, explicitFail, hapticDone]);

  const titleText = explicitFail ? 'Ödeme tamamlanamadı' : success ? 'Ödeme başarılı' : 'Ödeme durumu';
  const subtitleText = explicitFail
    ? payment?.failureReason ?? 'Ödeme başarısız veya iptal edildi. Gerekirse tekrar deneyin.'
    : success
      ? 'Siparişiniz alındı.'
      : 'Ödeme sonucunu kontrol edin.';

  const iconName = success ? 'check-circle' : explicitFail ? 'close-circle' : 'clock-outline';
  const iconColor = success ? '#2e7d4f' : explicitFail ? colors.error : colors.secondary;

  return (
    <SafeScreen edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Screen subtitle={subtitleText} title={titleText}>
          {loading && !order ? <ProductGridSkeleton /> : null}
          <View style={styles.iconWrap}>
            <MaterialCommunityIcons color={iconColor} name={iconName} size={72} />
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {order ? (
            <View style={styles.card}>
              <Text style={styles.orderNo}>{order.orderNumber}</Text>
              <Text style={styles.meta}>Sipariş: {statusLabel(order.status)}</Text>
              <Text style={styles.meta}>Ödeme: {paymentStatusLabel(payment?.status)}</Text>
              <Text style={styles.total}>{formatTry(order.grandTotal)}</Text>
            </View>
          ) : null}
          <PrimaryButton disabled={!orderId} label="Sipariş detayına git" onPress={() => orderId && router.replace(`/orders/${orderId}`)} />
          <SecondaryButton busy={loading} disabled={!orderId} label="Ödemeyi tekrar kontrol et" onPress={() => void load()} />
        </Screen>
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surfaceContainerLowest, borderColor: `${colors.outlineVariant}40`, borderRadius: radii.xl, borderWidth: 1, marginBottom: spacing.lg, padding: spacing.lg },
  error: { color: colors.error, fontFamily: typography.bodySemi.fontFamily, marginBottom: spacing.md, textAlign: 'center' },
  iconWrap: { alignItems: 'center', marginBottom: spacing.lg, marginTop: spacing.md },
  meta: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginTop: spacing.sm },
  orderNo: { ...typography.headlineSm, color: colors.primary },
  scroll: { paddingBottom: 40, paddingHorizontal: spacing.screenHorizontal },
  total: { ...typography.headlineMd, color: colors.secondary, marginTop: spacing.lg },
});
