import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { addCartItem, fetchProductBySlug, fetchProductReviews } from '@/api/client';
import { PrimaryButton, Screen } from '@/components/ui';
import { useAuth } from '@/context/auth-context';
import { useCart } from '@/context/cart-context';
import type { Product, ProductOptionGroup, Review } from '@/types';
import { formatTry } from '@/utils/format';
import { productImageUrl } from '@/utils/product-image';
import { colors, radii, spacing } from '@/theme';

export default function ProductDetailScreen(): React.JSX.Element {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { auth } = useAuth();
  const { reload: reloadCart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!slug) return;
    void fetchProductBySlug(slug).then((p) => {
      setProduct(p);
      void fetchProductReviews(p.id).then(setReviews);
    });
  }, [slug]);

  const optionIds = useMemo(() => Object.values(selections).flat(), [selections]);

  function toggleOption(group: ProductOptionGroup, optionId: string): void {
    setSelections((prev) => {
      const current = prev[group.id] ?? [];
      if (group.isMultiple) {
        const next = current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId];
        return { ...prev, [group.id]: next };
      }
      return { ...prev, [group.id]: [optionId] };
    });
  }

  function validateOptions(): boolean {
    if (!product?.optionGroups) return true;
    for (const group of product.optionGroups) {
      const selected = selections[group.id] ?? [];
      if (group.isRequired && !selected.length) {
        setError(`${group.name} seçimi zorunlu.`);
        return false;
      }
    }
    setError(null);
    return true;
  }

  async function addToCart(): Promise<void> {
    if (!product) return;
    if (!auth) {
      router.push('/login');
      return;
    }
    if (!validateOptions()) return;
    setBusy(true);
    try {
      await addCartItem(product.id, quantity, optionIds);
      await reloadCart();
      router.push('/cart');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sepete eklenemedi.');
    } finally {
      setBusy(false);
    }
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.loading}>Yükleniyor…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Geri</Text>
        </Pressable>
        <Image source={{ uri: productImageUrl(product) }} style={styles.hero} />
        <Screen title={product.name} subtitle={product.shortDescription ?? product.description ?? undefined}>
          <Text style={styles.price}>{formatTry(product.discountedPrice ?? product.price)}</Text>
          {(product.optionGroups ?? []).map((group) => (
            <View key={group.id} style={styles.group}>
              <Text style={styles.groupTitle}>{group.name}{group.isRequired ? ' *' : ''}</Text>
              {group.options.filter((o) => o.isActive).map((opt) => {
                const active = (selections[group.id] ?? []).includes(opt.id);
                return (
                  <Pressable key={opt.id} style={[styles.opt, active && styles.optActive]} onPress={() => toggleOption(group, opt.id)}>
                    <Text style={[styles.optText, active && styles.optTextActive]}>{opt.name}{Number(opt.priceModifier) ? ` (+${formatTry(opt.priceModifier)})` : ''}</Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
          <View style={styles.qtyRow}>
            <Pressable style={styles.qtyBtn} onPress={() => setQuantity((q) => Math.max(1, q - 1))}><Text>-</Text></Pressable>
            <Text style={styles.qty}>{quantity}</Text>
            <Pressable style={styles.qtyBtn} onPress={() => setQuantity((q) => q + 1)}><Text>+</Text></Pressable>
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton label="Sepete ekle" onPress={() => void addToCart()} busy={busy} />
          {reviews.length ? (
            <View style={styles.reviews}>
              <Text style={styles.reviewsTitle}>Yorumlar</Text>
              {reviews.map((r) => (
                <View key={r.id} style={styles.review}>
                  <Text style={styles.reviewRating}>{'★'.repeat(r.rating)}</Text>
                  {r.comment ? <Text style={styles.reviewComment}>{r.comment}</Text> : null}
                </View>
              ))}
            </View>
          ) : null}
        </Screen>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  back: { color: colors.accent, fontFamily: 'PlusJakartaSans_700Bold', marginBottom: spacing.md },
  error: { color: colors.error, marginBottom: spacing.md },
  group: { marginBottom: spacing.lg },
  groupTitle: { fontFamily: 'PlusJakartaSans_700Bold', marginBottom: spacing.sm },
  hero: { borderRadius: radii.xl, height: 260, marginBottom: spacing.lg, width: '100%' },
  loading: { margin: spacing.xl, textAlign: 'center' },
  opt: { backgroundColor: colors.surfaceLow, borderRadius: radii.pill, marginBottom: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: 10 },
  optActive: { backgroundColor: colors.chocolate },
  optText: { fontFamily: 'PlusJakartaSans_600SemiBold' },
  optTextActive: { color: colors.background },
  price: { color: colors.accent, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 22, marginBottom: spacing.lg },
  qty: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 18, minWidth: 32, textAlign: 'center' },
  qtyBtn: { alignItems: 'center', backgroundColor: colors.surfaceLow, borderRadius: radii.pill, height: 36, justifyContent: 'center', width: 36 },
  qtyRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  review: { backgroundColor: colors.surfaceLow, borderRadius: radii.lg, marginTop: spacing.sm, padding: spacing.md },
  reviewComment: { color: colors.textMuted, marginTop: 4 },
  reviewRating: { color: colors.gold },
  reviews: { marginTop: spacing.xl },
  reviewsTitle: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 20 },
  safe: { backgroundColor: colors.background, flex: 1 },
  scroll: { padding: spacing.xl, paddingBottom: 40 },
});
