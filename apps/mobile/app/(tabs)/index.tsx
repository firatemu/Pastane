import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { fetchActiveCampaigns, fetchCategories, fetchHomeBanners, fetchProducts } from '@/api/client';
import { BannerCarousel } from '@/components/catalog/banner-carousel';
import { ProductCard } from '@/components/catalog/product-card';
import { ProductGridSkeleton } from '@/components/feedback/skeleton';
import { AppHeader } from '@/components/layout/app-header';
import { SafeScreen } from '@/components/layout/safe-screen';
import { ErrorBanner } from '@/components/ui';
import { useAuth } from '@/context/auth-context';
import { useCart } from '@/context/cart-context';
import { typography } from '@/design-tokens';
import type { Campaign, Category, HomeBanner, Product } from '@/types';
import { productLabel } from '@/utils/product-label';
import { hasRequiredOptions } from '@/utils/product-options';
import { hapticLight, hapticSuccess } from '@/utils/haptics';
import { headerBar } from '@/design-tokens';
import { colors, radii, shadow, spacing } from '@/theme';

export default function HomeScreen(): React.JSX.Element {
  const router = useRouter();
  const { auth } = useAuth();
  const { addItem } = useCart();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [apiLive, setApiLive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const requestSeq = useRef(0);

  const load = useCallback(async () => {
    const seq = requestSeq.current + 1;
    requestSeq.current = seq;
    try {
      const [cats, prods, b, c] = await Promise.all([
        fetchCategories(),
        fetchProducts({ limit: 8 }),
        fetchHomeBanners(),
        fetchActiveCampaigns(),
      ]);
      if (requestSeq.current !== seq) return;
      setCategories(cats);
      setProducts(prods);
      setBanners(b);
      setCampaigns(c);
      setApiLive(true);
    } catch {
      if (requestSeq.current !== seq) return;
      setApiLive(false);
      setCategories([]);
      setProducts([]);
      setNotice('API bağlantısı kurulamadı. Lütfen bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      if (requestSeq.current === seq) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleAdd(product: Product): Promise<void> {
    if (!apiLive) {
      setNotice('Çevrimdışı modda sepete eklenemez.');
      return;
    }
    if (!auth) {
      router.push('/login');
      return;
    }
    if (hasRequiredOptions(product)) {
      router.push(`/product/${product.slug}`);
      return;
    }
    try {
      await addItem(product.id);
      void hapticSuccess();
      setNotice(`${productLabel(product)} sepete eklendi.`);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Sepete eklenemedi.');
    }
  }

  return (
    <SafeScreen edges={['top']} padded={false}>
      <AppHeader
        title="ANA SAYFA"
        showBrand
        showMenu
        showSearch
        onSearchPress={() => router.push('/products')}
        rightSlot={
          <Pressable accessibilityLabel="Profil" hitSlop={8} onPress={() => router.push('/account')} style={styles.avatarBtn}>
            <Text style={styles.avatarText}>{auth ? auth.user?.firstName?.trim().charAt(0)?.toUpperCase() || '?' : '◎'}</Text>
          </Pressable>
        }
      />
      {notice ? <View style={styles.noticePad}><ErrorBanner message={notice} onDismiss={() => setNotice(null)} /></View> : null}
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl onRefresh={() => { setRefreshing(true); void load(); }} refreshing={refreshing} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <BannerCarousel
          banners={banners}
          onPressCta={() => router.push('/products')}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {categories.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => {
                void hapticLight();
                router.push({ pathname: '/products', params: { categoryId: c.id } });
              }}
              style={styles.categoryItem}
            >
              <View style={styles.categoryIcon}>
                <MaterialCommunityIcons color={colors.primary} name="cupcake" size={22} />
              </View>
              <Text numberOfLines={1} style={styles.categoryLabel}>
                {c.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        {campaigns.length ? (
          <>
            <Text style={styles.sectionTitle}>Kampanyalar</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.campaignRow}>
              {campaigns.map((c) => (
                <View key={c.id} style={styles.campaignCard}>
                  <Text style={styles.campaignName}>{c.name}</Text>
                  {c.description ? <Text numberOfLines={2} style={styles.campaignDesc}>{c.description}</Text> : null}
                </View>
              ))}
            </ScrollView>
          </>
        ) : null}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Hızlı seçim</Text>
          <Pressable onPress={() => router.push('/products')}>
            <Text style={styles.seeAll}>Tümü</Text>
          </Pressable>
        </View>
        {loading ? (
          <ProductGridSkeleton />
        ) : products.length ? (
          <View style={styles.grid}>
            {products.slice(0, 6).map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onPress={() => router.push(`/product/${p.slug}`)}
                onAdd={apiLive ? () => void handleAdd(p) : undefined}
              />
            ))}
          </View>
        ) : (
          <Text style={styles.empty}>Şu anda gösterilecek ürün bulunamadı.</Text>
        )}
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  avatarBtn: { alignItems: 'center', backgroundColor: headerBar.iconBtnBg, borderRadius: radii.pill, height: 40, justifyContent: 'center', width: 40 },
  avatarText: { color: headerBar.iconColor, fontFamily: typography.bodyBold.fontFamily, fontSize: 16 },
  campaignCard: { backgroundColor: colors.primaryContainer, borderRadius: radii.xl, marginRight: spacing.md, maxWidth: 220, padding: spacing.lg, ...shadow },
  campaignDesc: { ...typography.bodyMd, color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 6 },
  campaignName: { ...typography.headlineSm, color: colors.secondaryContainer, fontSize: 17 },
  campaignRow: { marginBottom: spacing.lg },
  categoryIcon: { alignItems: 'center', backgroundColor: colors.surfaceContainer, borderRadius: radii.pill, height: 48, justifyContent: 'center', width: 48 },
  categoryItem: { alignItems: 'center', marginRight: spacing.lg, width: 72 },
  categoryLabel: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: 6, textAlign: 'center' },
  categoryScroll: { paddingBottom: spacing.lg, paddingHorizontal: spacing.screenHorizontal },
  empty: { ...typography.bodyMd, color: colors.onSurfaceVariant, paddingHorizontal: spacing.screenHorizontal, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: spacing.screenHorizontal },
  noticePad: { paddingHorizontal: spacing.screenHorizontal },
  scroll: { paddingBottom: spacing.section },
  sectionHead: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.screenHorizontal },
  sectionTitle: { ...typography.headlineSm, color: colors.primary, marginBottom: spacing.md, marginTop: spacing.md, paddingHorizontal: spacing.screenHorizontal },
  seeAll: { ...typography.labelSm, color: colors.primary, marginRight: spacing.screenHorizontal, marginTop: spacing.md },
});
