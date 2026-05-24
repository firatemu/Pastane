import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { cancelOrder, createReview, fetchOrder } from '@/api/client';
import { ProductGridSkeleton } from '@/components/feedback/skeleton';
import { AppHeader } from '@/components/layout/app-header';
import { SafeScreen } from '@/components/layout/safe-screen';
import { OrderTimeline, StatusBadge } from '@/components/orders/order-row';
import { Field, PrimaryButton, Screen, SecondaryButton } from '@/components/ui';
import { typography } from '@/design-tokens';
import { useMobileAdaptivePolling } from '@/hooks/use-mobile-adaptive-polling';
import { reviewSchema } from '@/schemas/forms';
import type { Order } from '@/types';
import { formatDate, formatTry } from '@/utils/format';
import { ACTIVE_ORDER_STATUSES, CANCELLABLE_STATUSES, deliveryStatusLabel, paymentStatusLabel } from '@/utils/order-status';
import { colors, radii, spacing } from '@/theme';

function reviewStatusLabel(status?: string): string {
  if (status === 'APPROVED') return 'Onaylandı';
  if (status === 'PENDING') return 'İnceleniyor';
  if (status === 'REJECTED') return 'Reddedildi';
  return status ?? '';
}

export default function OrderDetailScreen(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [rating, setRating] = useState('5');
  const [comment, setComment] = useState('');
  const [reviewItemId, setReviewItemId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const orderRef = useRef<Order | null>(null);

  const refreshOrder = useCallback(async () => {
    if (!id) return;
    try {
      const o = await fetchOrder(id);
      setOrder(o);
      setError(null);
    } catch {
      setError('Sipariş yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    orderRef.current = order;
  }, [order]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    void refreshOrder();
  }, [id, refreshOrder]);

  const pollTick = useCallback(async () => {
    if (!(orderRef.current && ACTIVE_ORDER_STATUSES.has(orderRef.current.status))) {
      return 'ok' as const;
    }
    try {
      const o = await fetchOrder(id!);
      setOrder(o);
      return 'ok' as const;
    } catch {
      return 'error' as const;
    }
  }, [id]);

  useMobileAdaptivePolling({ poll: pollTick, immediate: false, baseIntervalMs: 25_000 });

  async function submitReview(productId: string, orderItemId: string): Promise<void> {
    const parsed = reviewSchema.safeParse({ rating: Number(rating), comment: comment.trim() || undefined });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Geçersiz puan.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createReview({ productId, orderItemId, ...parsed.data });
      setReviewItemId(null);
      setComment('');
      await refreshOrder();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yorum gönderilemedi.');
    } finally {
      setBusy(false);
    }
  }

  if (loading && !order) {
    return (
      <SafeScreen edges={['top']} padded={false}>
        <AppHeader showBack showMenu title="SİPARİŞ" onBackPress={() => router.back()} />
        <ProductGridSkeleton />
        {error ? <Text style={styles.errorCenter}>{error}</Text> : null}
        {error ? <SecondaryButton label="Tekrar dene" onPress={() => void refreshOrder()} /> : null}
      </SafeScreen>
    );
  }

  if (!order) {
    return (
      <SafeScreen edges={['top']} padded={false}>
        <AppHeader showBack showMenu title="SİPARİŞ" onBackPress={() => router.back()} />
        <Text style={styles.loading}>{error ?? 'Sipariş bulunamadı.'}</Text>
        <SecondaryButton label="Geri dön" onPress={() => router.back()} />
      </SafeScreen>
    );
  }

  const payment = order.payments?.[0];
  const delivery = order.delivery;

  return (
    <SafeScreen edges={['top']} padded={false}>
      <AppHeader showBack showMenu title="SİPARİŞ" onBackPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.pad}>
          <Screen subtitle={`${formatDate(order.createdAt)}`} title={order.orderNumber}>
            <View style={styles.statusRow}>
              <StatusBadge status={order.status} />
            </View>

            <OrderTimeline currentStatus={order.status} history={order.statusHistory} />

            {delivery && order.deliveryType === 'HOME_DELIVERY' ? (
              <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>Kurye takibi</Text>
                <Text style={styles.infoText}>{deliveryStatusLabel(delivery.status)}</Text>
                {delivery.pickedUpAt ? <Text style={styles.infoMeta}>Alındı: {formatDate(delivery.pickedUpAt)}</Text> : null}
                {delivery.deliveredAt ? <Text style={styles.infoMeta}>Teslim: {formatDate(delivery.deliveredAt)}</Text> : null}
                {delivery.failedReason ? <Text style={styles.errorInline}>{delivery.failedReason}</Text> : null}
              </View>
            ) : null}

            {order.deliveryType === 'HOME_DELIVERY' && order.addressSnapshot ? (
              <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>Teslimat adresi</Text>
                <Text style={styles.infoText}>{order.addressSnapshot.title}</Text>
                <Text style={styles.infoText}>{order.addressSnapshot.fullAddress}</Text>
                <Text style={styles.infoMeta}>
                  {order.addressSnapshot.district}, {order.addressSnapshot.city}
                </Text>
              </View>
            ) : null}

            {order.deliveryType === 'PICKUP' && order.pickupStore ? (
              <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>Mağazadan alım</Text>
                <Text style={styles.infoText}>{order.pickupStore.name}</Text>
                <Text style={styles.infoMeta}>{order.pickupStore.address}</Text>
              </View>
            ) : null}

            {order.note ? (
              <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>Sipariş notu</Text>
                <Text style={styles.infoText}>{order.note}</Text>
              </View>
            ) : null}

            {order.items.map((item) => (
              <View key={item.id} style={styles.item}>
                <Text style={styles.itemName}>{item.productNameSnapshot}</Text>
                {item.options?.length ? (
                  <Text style={styles.itemOptions}>{item.options.map((o) => o.optionNameSnapshot).join(', ')}</Text>
                ) : null}
                {item.customNote ? <Text style={styles.itemNote}>Not: {item.customNote}</Text> : null}
                <Text style={styles.itemMeta}>
                  {item.quantity} adet · {formatTry(item.unitPriceSnapshot)}
                </Text>
                {item.review ? (
                  <Text style={styles.reviewDone}>
                    Yorumunuz: {'★'.repeat(item.review.rating)} · {reviewStatusLabel(item.review.status)}
                  </Text>
                ) : null}
                {order.status === 'DELIVERED' && !item.review && item.product ? (
                  reviewItemId === item.id ? (
                    <View style={styles.reviewForm}>
                      <Field keyboardType="number-pad" label="Puan (1-5)" onChangeText={setRating} value={rating} />
                      <Field label="Yorum" multiline onChangeText={setComment} value={comment} />
                      <PrimaryButton busy={busy} label="Gönder" onPress={() => void submitReview(item.product!.id, item.id)} />
                    </View>
                  ) : (
                    <Pressable onPress={() => setReviewItemId(item.id)}>
                      <Text style={styles.reviewLink}>Yorum yaz</Text>
                    </Pressable>
                  )
                ) : null}
              </View>
            ))}

            <View style={styles.totals}>
              <Text style={styles.totalRow}>Ara toplam: {formatTry(order.subtotal)}</Text>
              <Text style={styles.totalRow}>Teslimat: {formatTry(order.deliveryFee)}</Text>
              {Number(order.serviceFee ?? 0) > 0 ? <Text style={styles.totalRow}>Hizmet: {formatTry(order.serviceFee)}</Text> : null}
              {Number(order.loyaltyDiscount ?? 0) > 0 ? (
                <Text style={styles.totalRow}>Puan indirimi: -{formatTry(order.loyaltyDiscount)}</Text>
              ) : null}
              <Text style={styles.grand}>Toplam: {formatTry(order.grandTotal)}</Text>
            </View>

            {payment ? (
              <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>Ödeme</Text>
                <Text style={[styles.paymentStatus, { color: payment.status === 'SUCCESS' ? '#2e7d4f' : payment.status === 'FAILED' ? colors.error : colors.secondary }]}>
                  {paymentStatusLabel(payment.status)}
                </Text>
                {payment.failureReason ? <Text style={styles.errorInline}>{payment.failureReason}</Text> : null}
              </View>
            ) : null}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            {CANCELLABLE_STATUSES.has(order.status) ? (
              <PrimaryButton
                busy={busy}
                label="Siparişi iptal et"
                onPress={() => {
                  setBusy(true);
                  void cancelOrder(order.id)
                    .then(() => router.back())
                    .catch((e) => setError(e instanceof Error ? e.message : 'İptal edilemedi.'))
                    .finally(() => setBusy(false));
                }}
              />
            ) : null}
          </Screen>
        </View>
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  error: { color: colors.error, fontFamily: typography.bodySemi.fontFamily, marginBottom: spacing.md },
  errorCenter: { color: colors.error, marginTop: spacing.md, textAlign: 'center' },
  errorInline: { color: colors.error, fontSize: 12, marginTop: 4 },
  grand: { ...typography.headlineSm, color: colors.primary, marginTop: spacing.sm },
  infoCard: { backgroundColor: colors.surfaceContainerLow, borderRadius: radii.lg, marginBottom: spacing.md, padding: spacing.md },
  infoMeta: { ...typography.bodyMd, color: colors.onSurfaceVariant, fontSize: 12, marginTop: 4 },
  infoText: { ...typography.bodyMd, marginTop: 2 },
  infoTitle: { ...typography.labelSm, color: colors.onSurfaceVariant, textTransform: 'none' },
  item: { backgroundColor: colors.surfaceContainerLow, borderRadius: radii.lg, marginBottom: spacing.sm, padding: spacing.md },
  itemMeta: { ...typography.bodyMd, color: colors.onSurfaceVariant, fontSize: 12, marginTop: 4 },
  itemName: { ...typography.bodyMd, fontFamily: typography.price.fontFamily },
  itemNote: { ...typography.bodyMd, color: colors.onSurfaceVariant, fontStyle: 'italic', fontSize: 11, marginTop: 2 },
  itemOptions: { ...typography.labelSm, color: colors.secondary, marginTop: 2, textTransform: 'none' },
  loading: { margin: spacing.xl, textAlign: 'center' },
  pad: { paddingHorizontal: spacing.screenHorizontal },
  paymentStatus: { ...typography.bodyMd, fontFamily: typography.price.fontFamily, marginTop: spacing.sm },
  reviewDone: { ...typography.bodyMd, color: colors.primary, fontFamily: typography.price.fontFamily, fontSize: 12, marginTop: spacing.sm },
  reviewForm: { marginTop: spacing.md },
  reviewLink: { ...typography.bodyMd, color: colors.primary, fontFamily: typography.price.fontFamily, marginTop: spacing.sm },
  scroll: { paddingBottom: 40, paddingTop: spacing.md },
  statusRow: { marginBottom: spacing.md },
  totalRow: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginTop: 4 },
  totals: { backgroundColor: colors.surfaceContainerLowest, borderRadius: radii.lg, marginVertical: spacing.lg, padding: spacing.lg },
});
