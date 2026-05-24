import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { addCartItem, fetchProductBySlug, fetchProductReviews } from '@/api/client';
import { ProductGridSkeleton } from '@/components/feedback/skeleton';
import { SafeScreen } from '@/components/layout/safe-screen';
import { Field, PrimaryButton, Screen, SecondaryButton } from '@/components/ui';
import { typography } from '@/design-tokens';
import { useAuth } from '@/context/auth-context';
import { useCart } from '@/context/cart-context';
import type { Product, ProductOptionGroup, Review } from '@/types';
import { formatTry } from '@/utils/format';
import { hapticLight, hapticSuccess } from '@/utils/haptics';
import { productLabel } from '@/utils/product-label';
import { productImageUrl } from '@/utils/product-image';
import { colors, radii, spacing } from '@/theme';

const GALLERY_WIDTH = Dimensions.get('window').width - spacing.screenHorizontal * 2;

export default function ProductDetailScreen(): React.JSX.Element {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { auth } = useAuth();
  const { reload: reloadCart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [quantity, setQuantity] = useState(1);
  const [customNote, setCustomNote] = useState('');
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setLoadError(null);
    void fetchProductBySlug(slug)
      .then((p) => {
        setProduct(p);
        return fetchProductReviews(p.id).then(setReviews);
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : 'Ürün yüklenemedi.'))
      .finally(() => setLoading(false));
  }, [slug]);

  const galleryImages = useMemo(() => {
    if (!product) return [];
    const imgs = product.images?.length ? product.images : [{ url: productImageUrl(product), isPrimary: true }];
    return [...imgs].sort((a, b) => (a.isPrimary ? -1 : 0) - (b.isPrimary ? -1 : 0));
  }, [product]);

  const optionIds = useMemo(() => Object.values(selections).flat(), [selections]);

  function toggleOption(group: ProductOptionGroup, optionId: string): void {
    void hapticLight();
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
    if (product.isPurchasable === false) {
      setError(product.availabilityReason ?? 'Ürün şu anda satışa kapalı.');
      return;
    }
    if (!auth) {
      router.push('/login');
      return;
    }
    if (!validateOptions()) return;
    setBusy(true);
    try {
      await addCartItem(product.id, quantity, optionIds, customNote.trim() || undefined);
      await reloadCart();
      await hapticSuccess();
      router.push('/cart');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sepete eklenemedi.');
    } finally {
      setBusy(false);
    }
  }

  function onGalleryScroll(e: NativeSyntheticEvent<NativeScrollEvent>): void {
    const x = e.nativeEvent.contentOffset.x;
    setGalleryIndex(Math.round(x / GALLERY_WIDTH));
  }

  if (loading) {
    return (
      <SafeScreen edges={['top']}>
        <ProductGridSkeleton />
      </SafeScreen>
    );
  }

  if (loadError || !product) {
    return (
      <SafeScreen edges={['top']}>
        <Text style={styles.error}>{loadError ?? 'Ürün bulunamadı.'}</Text>
        <SecondaryButton label="Geri dön" onPress={() => router.back()} />
      </SafeScreen>
    );
  }

  const notPurchasable = product.isPurchasable === false;
  const allergens = product.allergens ?? [];

  return (
    <SafeScreen edges={['top']} padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable accessibilityLabel="Geri" hitSlop={8} onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons color={colors.primary} name="arrow-left" size={22} />
        </Pressable>
        {galleryImages.length > 1 ? (
          <>
            <FlatList
              data={galleryImages}
              horizontal
              keyExtractor={(item, i) => item.url + i}
              onMomentumScrollEnd={onGalleryScroll}
              pagingEnabled
              renderItem={({ item }) => <Image source={{ uri: item.url }} style={styles.hero} />}
              showsHorizontalScrollIndicator={false}
              style={styles.gallery}
            />
            <View style={styles.dots}>
              {galleryImages.map((_, i) => (
                <View key={i} style={[styles.dot, i === galleryIndex && styles.dotActive]} />
              ))}
            </View>
          </>
        ) : (
          <Image source={{ uri: galleryImages[0]?.url ?? productImageUrl(product) }} style={styles.hero} />
        )}
        <View style={styles.pad}>
          <Screen title={productLabel(product)} subtitle={product.shortDescription ?? product.description ?? undefined}>
            <Text style={styles.price}>{formatTry(product.discountedPrice ?? product.price)}</Text>
            {allergens.length ? (
              <View style={styles.allergenBlock}>
                <Text style={styles.allergenTitle}>Alerjenler</Text>
                <View style={styles.allergenRow}>
                  {allergens.map(({ allergen }) => (
                    <View key={allergen.id} style={styles.allergenChip}>
                      <Text style={styles.allergenText}>{allergen.name}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
            {notPurchasable ? (
              <Text style={styles.unavailable}>{product.availabilityReason ?? 'Bu ürün şu anda satışa kapalı.'}</Text>
            ) : null}
            {(product.optionGroups ?? []).map((group) => (
              <View key={group.id} style={styles.group}>
                <Text style={styles.groupTitle}>
                  {group.name}
                  {group.isRequired ? ' *' : ''}
                </Text>
                {group.options
                  .filter((o) => o.isActive)
                  .map((opt) => {
                    const active = (selections[group.id] ?? []).includes(opt.id);
                    return (
                      <Pressable key={opt.id} style={[styles.opt, active && styles.optActive]} onPress={() => toggleOption(group, opt.id)}>
                        <Text style={[styles.optText, active && styles.optTextActive]}>
                          {opt.name}
                          {Number(opt.priceModifier) ? ` (+${formatTry(opt.priceModifier)})` : ''}
                        </Text>
                      </Pressable>
                    );
                  })}
              </View>
            ))}
            <Field label="Özel not (isteğe bağlı)" multiline onChangeText={setCustomNote} placeholder="Örn. yazı istiyorum" value={customNote} />
            <View style={styles.qtyRow}>
              <Pressable style={styles.qtyBtn} onPress={() => { void hapticLight(); setQuantity((q) => Math.max(1, q - 1)); }}>
                <MaterialCommunityIcons color={colors.primary} name="minus" size={18} />
              </Pressable>
              <Text style={styles.qty}>{quantity}</Text>
              <Pressable style={styles.qtyBtn} onPress={() => { void hapticLight(); setQuantity((q) => q + 1); }}>
                <MaterialCommunityIcons color={colors.primary} name="plus" size={18} />
              </Pressable>
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <PrimaryButton busy={busy} disabled={notPurchasable} label="Sepete ekle" onPress={() => void addToCart()} />
            {reviews.length ? (
              <View style={styles.reviews}>
                <Text style={styles.reviewsTitle}>Yorumlar</Text>
                {reviews.map((r) => (
                  <View key={r.id} style={styles.review}>
                    <Text style={styles.reviewAuthor}>{r.user ? `${r.user.firstName} ${r.user.lastName.charAt(0)}.` : 'Müşteri'}</Text>
                    <Text style={styles.reviewRating}>{'★'.repeat(r.rating)}</Text>
                    {r.comment ? <Text style={styles.reviewComment}>{r.comment}</Text> : null}
                  </View>
                ))}
              </View>
            ) : null}
          </Screen>
        </View>
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  allergenBlock: { marginBottom: spacing.lg },
  allergenChip: { backgroundColor: `${colors.secondaryContainer}66`, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: 6 },
  allergenRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  allergenText: { ...typography.bodyMd, color: colors.secondary, fontFamily: typography.price.fontFamily, fontSize: 13 },
  allergenTitle: { ...typography.labelSm, color: colors.onSurfaceVariant, textTransform: 'none' },
  backBtn: { left: spacing.screenHorizontal, position: 'absolute', top: spacing.md, zIndex: 2 },
  dot: { backgroundColor: colors.outlineVariant, borderRadius: 4, height: 8, width: 8 },
  dotActive: { backgroundColor: colors.primary, width: 20 },
  dots: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: spacing.md },
  error: { color: colors.error, marginBottom: spacing.md, textAlign: 'center' },
  gallery: { marginBottom: spacing.sm },
  group: { marginBottom: spacing.lg },
  groupTitle: { ...typography.bodyMd, fontFamily: typography.price.fontFamily, marginBottom: spacing.sm },
  hero: { borderRadius: radii.xl, height: 260, width: GALLERY_WIDTH },
  opt: { backgroundColor: colors.surfaceContainerLow, borderRadius: radii.pill, marginBottom: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: 10 },
  optActive: { backgroundColor: colors.primary },
  optText: { ...typography.bodyMd, fontFamily: typography.price.fontFamily },
  optTextActive: { color: colors.onPrimary },
  pad: { paddingHorizontal: spacing.screenHorizontal },
  price: { ...typography.headlineSm, color: colors.secondary, marginBottom: spacing.lg },
  qty: { ...typography.headlineSm, fontSize: 18, minWidth: 32, textAlign: 'center' },
  qtyBtn: { alignItems: 'center', backgroundColor: colors.surfaceContainerLow, borderRadius: radii.pill, height: 40, justifyContent: 'center', width: 40 },
  qtyRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  review: { backgroundColor: colors.surfaceContainerLow, borderRadius: radii.lg, marginTop: spacing.sm, padding: spacing.md },
  reviewAuthor: { ...typography.bodyMd, fontFamily: typography.price.fontFamily, fontSize: 12 },
  reviewComment: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginTop: 4 },
  reviewRating: { color: colors.secondary, marginTop: 2 },
  reviews: { marginTop: spacing.xxl },
  reviewsTitle: { ...typography.headlineMd, color: colors.primary },
  scroll: { paddingBottom: 40, paddingTop: spacing.md },
  unavailable: { backgroundColor: colors.errorContainer, borderRadius: radii.lg, color: colors.error, fontFamily: typography.price.fontFamily, marginBottom: spacing.lg, padding: spacing.md },
});
