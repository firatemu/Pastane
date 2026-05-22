import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cancelOrder, createReview, fetchOrder } from '@/api/client';
import { Field, PrimaryButton, Screen } from '@/components/ui';
import type { Order } from '@/types';
import { formatDate, formatTry } from '@/utils/format';
import { CANCELLABLE_STATUSES, CUSTOMER_TIMELINE, statusLabel } from '@/utils/order-status';
import { colors, radii, spacing } from '@/theme';

export default function OrderDetailScreen(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewItemId, setReviewItemId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    void fetchOrder(id).then(setOrder).catch(() => setError('Sipariş yüklenemedi.'));
  }, [id]);

  async function submitReview(productId: string, orderItemId: string): Promise<void> {
    try {
      await createReview({ productId, orderItemId, rating, comment: comment.trim() || undefined });
      setReviewItemId(null);
      if (id) void fetchOrder(id).then(setOrder);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yorum gönderilemedi.');
    }
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.loading}>{error ?? 'Yükleniyor…'}</Text>
      </SafeAreaView>
    );
  }

  const timelineIndex = CUSTOMER_TIMELINE.indexOf(order.status as (typeof CUSTOMER_TIMELINE)[number]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable onPress={() => router.back()}><Text style={styles.back}>← Geri</Text></Pressable>
        <Screen title={order.orderNumber} subtitle={`${formatDate(order.createdAt)} · ${statusLabel(order.status)}`}>
          <View style={styles.timeline}>
            {CUSTOMER_TIMELINE.map((step, index) => (
              <View key={step} style={styles.step}>
                <View style={[styles.dot, index <= timelineIndex && styles.dotActive]} />
                <Text style={[styles.stepLabel, index <= timelineIndex && styles.stepLabelActive]}>{statusLabel(step)}</Text>
              </View>
            ))}
          </View>
          {order.items.map((item) => (
            <View key={item.id} style={styles.item}>
              <Text style={styles.itemName}>{item.productNameSnapshot}</Text>
              <Text style={styles.itemMeta}>{item.quantity} adet · {formatTry(item.unitPriceSnapshot)}</Text>
              {order.status === 'DELIVERED' && !item.review && item.product ? (
                reviewItemId === item.id ? (
                  <View style={styles.reviewForm}>
                    <Field label="Puan (1-5)" keyboardType="number-pad" value={String(rating)} onChangeText={(v) => setRating(Number(v) || 5)} />
                    <Field label="Yorum" value={comment} onChangeText={setComment} multiline />
                    <PrimaryButton label="Gönder" onPress={() => void submitReview(item.product!.id, item.id)} />
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
            <Text>Ara toplam: {formatTry(order.subtotal)}</Text>
            <Text>Teslimat: {formatTry(order.deliveryFee)}</Text>
            <Text style={styles.grand}>Toplam: {formatTry(order.grandTotal)}</Text>
          </View>
          {CANCELLABLE_STATUSES.has(order.status) ? (
            <PrimaryButton label="Siparişi iptal et" onPress={() => void cancelOrder(order.id).then(() => router.back())} />
          ) : null}
        </Screen>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  back: { color: colors.accent, fontFamily: 'PlusJakartaSans_700Bold', marginBottom: spacing.md },
  dot: { backgroundColor: colors.outline, borderRadius: 6, height: 12, marginRight: spacing.sm, width: 12 },
  dotActive: { backgroundColor: colors.accent },
  grand: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 18, marginTop: spacing.sm },
  item: { backgroundColor: colors.surfaceLow, borderRadius: radii.lg, marginBottom: spacing.sm, padding: spacing.md },
  itemMeta: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  itemName: { fontFamily: 'PlusJakartaSans_700Bold' },
  loading: { margin: spacing.xl, textAlign: 'center' },
  reviewForm: { marginTop: spacing.md },
  reviewLink: { color: colors.accent, fontFamily: 'PlusJakartaSans_700Bold', marginTop: spacing.sm },
  safe: { backgroundColor: colors.background, flex: 1 },
  scroll: { padding: spacing.xl, paddingBottom: 40 },
  step: { alignItems: 'center', flexDirection: 'row', marginBottom: spacing.sm },
  stepLabel: { color: colors.textMuted, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 13 },
  stepLabelActive: { color: colors.text, fontFamily: 'PlusJakartaSans_600SemiBold' },
  timeline: { marginBottom: spacing.lg },
  totals: { backgroundColor: colors.surface, borderRadius: radii.lg, marginVertical: spacing.lg, padding: spacing.lg },
});
