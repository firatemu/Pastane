import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchCategories, fetchHomeBanners, fetchProducts } from '@/api/client';
import { ProductCard } from '@/components/product-card';
import { ErrorBanner } from '@/components/ui';
import { useAuth } from '@/context/auth-context';
import { useCart } from '@/context/cart-context';
import { fallbackCategories, fallbackImages, fallbackProducts } from '@/data/fallback';
import type { Category, HomeBanner, Product } from '@/types';
import { productLabel } from '@/utils/product-label';
import { colors, radii, shadow, spacing } from '@/theme';

export default function HomeScreen(): React.JSX.Element {
  const router = useRouter();
  const { auth } = useAuth();
  const { addItem } = useCart();
  const [categories, setCategories] = useState<Category[]>(fallbackCategories);
  const [products, setProducts] = useState<Product[]>(fallbackProducts);
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([fetchCategories(), fetchProducts({ limit: 8 }), fetchHomeBanners()])
      .then(([cats, prods, b]) => {
        if (cats.length) setCategories(cats);
        if (prods.length) setProducts(prods);
        setBanners(b);
      })
      .catch(() => setNotice('Canlı API bulunamadı; örnek veriler gösteriliyor.'));
  }, []);

  const heroImage = banners[0]?.mobileMediaUrl ?? banners[0]?.desktopMediaUrl ?? fallbackImages.hero;

  async function handleAdd(product: Product): Promise<void> {
    if (!auth) {
      router.push('/login');
      return;
    }
    try {
      await addItem(product.id);
      setNotice(`${productLabel(product)} sepete eklendi.`);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Sepete eklenemedi.');
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>Pasta-Hane</Text>
          <Text style={styles.sub}>Artisanal bakery</Text>
        </View>
        <Pressable style={styles.avatar} onPress={() => router.push('/account')}>
          <Text style={styles.avatarText}>{auth ? auth.user.firstName.slice(0, 1).toUpperCase() : '◎'}</Text>
        </Pressable>
      </View>
      {notice ? <ErrorBanner message={notice} onDismiss={() => setNotice(null)} /> : null}
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ImageBackground source={{ uri: heroImage }} imageStyle={styles.heroImg} style={styles.hero}>
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <Text style={styles.eyebrow}>Rosemary & Wild Honey</Text>
            <Text style={styles.heroTitle}>Taze pasta ve butik tatlı seçkisi</Text>
            <Pressable style={styles.cta} onPress={() => router.push('/products')}>
              <Text style={styles.ctaText}>Koleksiyonu keşfet</Text>
            </Pressable>
          </View>
        </ImageBackground>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {categories.map((c) => (
            <Pressable key={c.id} style={styles.chip} onPress={() => router.push({ pathname: '/products', params: { categoryId: c.id } })}>
              <Text style={styles.chipIcon}>{c.name.slice(0, 1)}</Text>
              <Text style={styles.chipLabel}>{c.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={styles.grid}>
          {products.slice(0, 6).map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              onPress={() => router.push(`/product/${p.slug}`)}
              onAdd={() => void handleAdd(p)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.pill, height: 42, justifyContent: 'center', width: 42, ...shadow },
  avatarText: { color: colors.chocolate, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16 },
  brand: { color: colors.primary, fontFamily: 'PlayfairDisplay_700Bold', fontSize: 23, letterSpacing: 1.8, textTransform: 'uppercase' },
  chip: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.xl, marginRight: spacing.md, minWidth: 92, padding: spacing.md, ...shadow },
  chipIcon: { color: colors.gold, fontFamily: 'PlayfairDisplay_700Bold', fontSize: 26 },
  chipLabel: { color: colors.text, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, marginTop: 8, textAlign: 'center' },
  chips: { paddingVertical: spacing.md },
  cta: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: colors.accent, borderRadius: radii.pill, marginTop: spacing.lg, paddingHorizontal: spacing.xl, paddingVertical: 14 },
  ctaText: { color: colors.surface, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14 },
  eyebrow: { color: colors.gold, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  hero: { borderRadius: radii.xl, height: 220, justifyContent: 'flex-end', marginBottom: spacing.section, overflow: 'hidden' },
  heroContent: { padding: spacing.xl },
  heroImg: { borderRadius: radii.xl },
  heroOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(33,26,20,0.42)' },
  heroTitle: { color: colors.surface, fontFamily: 'PlayfairDisplay_700Bold', fontSize: 30, lineHeight: 36, marginTop: spacing.sm, maxWidth: 300 },
  safe: { backgroundColor: colors.background, flex: 1 },
  scroll: { paddingBottom: 24, paddingHorizontal: spacing.xl },
  sub: { color: colors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11, letterSpacing: 1.2, marginTop: -2, textTransform: 'uppercase' },
});
