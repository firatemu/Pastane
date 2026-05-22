import { StatusBar } from 'expo-status-bar';
import { useFonts, PlayfairDisplay_600SemiBold, PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import { PlusJakartaSans_400Regular, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { addCartItem, fetchCart, fetchCategories, fetchProducts, loadStoredAuth, login, saveStoredAuth } from './src/api/client';
import { fallbackCart, fallbackCategories, fallbackImages, fallbackProducts } from './src/data/fallback';
import { colors, radii, shadow, spacing } from './src/theme';
import type { AuthState, CartItem, Category, Product } from './src/types';

type Screen = 'home' | 'products' | 'cart' | 'orders' | 'login';

const money = new Intl.NumberFormat('tr-TR', { currency: 'TRY', style: 'currency' });

function price(value: string | number | null | undefined): string {
  return money.format(Number(value ?? 0));
}

function productImage(product: Product): string {
  return product.images?.find((image) => image.isPrimary)?.url ?? product.images?.[0]?.url ?? fallbackImages.pastry;
}

function cartTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + Number(item.unitPrice || item.product.discountedPrice || item.product.price) * item.quantity, 0);
}

export default function App(): React.JSX.Element {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });
  const [screen, setScreen] = useState<Screen>('home');
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [categories, setCategories] = useState<Category[]>(fallbackCategories);
  const [products, setProducts] = useState<Product[]>(fallbackProducts);
  const [cart, setCart] = useState<CartItem[]>(fallbackCart);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function bootstrap(): Promise<void> {
      try {
        const stored = await loadStoredAuth();
        if (active) setAuth(stored);
        const [nextCategories, nextProducts] = await Promise.all([fetchCategories(), fetchProducts()]);
        if (!active) return;
        setCategories(nextCategories.length ? nextCategories : fallbackCategories);
        setProducts(nextProducts.length ? nextProducts : fallbackProducts);
        if (stored?.accessToken) {
          const nextCart = await fetchCart(stored.accessToken).catch(() => fallbackCart);
          if (active) setCart(nextCart.length ? nextCart : fallbackCart);
        }
      } catch {
        if (active) setNotice('Canlı API bulunamadı; tasarım önizlemesi örnek verilerle açıldı.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void bootstrap();
    return () => {
      active = false;
    };
  }, []);

  const filteredProducts = useMemo(() => {
    if (!selectedCategory) return products;
    return products.filter((product) => product.category?.id === selectedCategory || product.category?.slug === selectedCategory);
  }, [products, selectedCategory]);

  async function addToCart(product: Product): Promise<void> {
    if (!auth) {
      setScreen('login');
      setNotice('Sepete eklemek için giriş yapın.');
      return;
    }
    try {
      await addCartItem(auth.accessToken, product.id);
      const nextCart = await fetchCart(auth.accessToken);
      setCart(nextCart);
      setNotice(`${product.name} sepete eklendi.`);
    } catch {
      setCart((items) => {
        const existing = items.find((item) => item.product.id === product.id);
        if (existing) {
          return items.map((item) => (item.id === existing.id ? { ...item, quantity: item.quantity + 1 } : item));
        }
        return [{ id: `local-${product.id}`, product, quantity: 1, unitPrice: product.discountedPrice ?? product.price }, ...items];
      });
      setNotice('API yanıt vermedi; ürün yerel önizleme sepetine eklendi.');
    }
  }

  async function logout(): Promise<void> {
    await saveStoredAuth(null);
    setAuth(null);
    setScreen('home');
  }

  if (!fontsLoaded || loading) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.loadingText}>Pasta-Hane hazırlanıyor</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.app}>
        <Header auth={auth} onAccount={() => setScreen(auth ? 'orders' : 'login')} />
        {notice ? (
          <Pressable style={styles.notice} onPress={() => setNotice(null)}>
            <Text style={styles.noticeText}>{notice}</Text>
          </Pressable>
        ) : null}
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {screen === 'home' ? (
            <HomeScreen categories={categories} products={products} onOpenProducts={() => setScreen('products')} onSelectCategory={(id) => { setSelectedCategory(id); setScreen('products'); }} onAdd={addToCart} />
          ) : null}
          {screen === 'products' ? (
            <ProductsScreen categories={categories} products={filteredProducts} selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} onAdd={addToCart} />
          ) : null}
          {screen === 'cart' ? <CartScreen items={cart} isLoggedIn={!!auth} onLogin={() => setScreen('login')} /> : null}
          {screen === 'orders' ? <OrdersScreen auth={auth} onLogin={() => setScreen('login')} onLogout={logout} /> : null}
          {screen === 'login' ? <LoginScreen onLoggedIn={(nextAuth) => { setAuth(nextAuth); setNotice('Hoş geldiniz.'); setScreen('home'); }} /> : null}
        </ScrollView>
        <BottomNav current={screen} cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)} onChange={setScreen} />
      </View>
    </SafeAreaView>
  );
}

function Header({ auth, onAccount }: { auth: AuthState | null; onAccount: () => void }): React.JSX.Element {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.brand}>Pasta-Hane</Text>
        <Text style={styles.headerSub}>Artisanal bakery</Text>
      </View>
      <Pressable style={styles.headerIcon} onPress={onAccount}>
        <Text style={styles.headerIconText}>{auth ? auth.user.firstName.slice(0, 1).toUpperCase() : '◎'}</Text>
      </Pressable>
    </View>
  );
}

function HomeScreen({ categories, products, onOpenProducts, onSelectCategory, onAdd }: {
  categories: Category[];
  products: Product[];
  onOpenProducts: () => void;
  onSelectCategory: (id: string) => void;
  onAdd: (product: Product) => Promise<void>;
}): React.JSX.Element {
  return (
    <View>
      <ImageBackground source={{ uri: fallbackImages.hero }} imageStyle={styles.heroImage} style={styles.hero}>
        <View style={styles.heroOverlay} />
        <View style={styles.heroContent}>
          <Text style={styles.eyebrow}>Rosemary & Wild Honey</Text>
          <Text style={styles.heroTitle}>Taze pasta ve butik tatlı seçkisi</Text>
          <Text style={styles.heroCopy}>Günlük üretim, yumuşak teslimat ve rafine pastane deneyimi.</Text>
          <Pressable style={styles.primaryButton} onPress={onOpenProducts}>
            <Text style={styles.primaryButtonText}>Koleksiyonu keşfet</Text>
          </Pressable>
        </View>
      </ImageBackground>

      <SectionHeader title="Hızlı Seçim" action="Tümü" onAction={onOpenProducts} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
        {categories.map((category) => (
          <Pressable key={category.id} style={styles.categoryChip} onPress={() => onSelectCategory(category.id)}>
            <Text style={styles.categoryIcon}>{category.name.slice(0, 1)}</Text>
            <Text style={styles.categoryLabel}>{category.name}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.productGrid}>
        {products.slice(0, 4).map((product) => (
          <ProductCard key={product.id} product={product} onAdd={() => onAdd(product)} />
        ))}
      </View>

      <View style={styles.quotePanel}>
        <Text style={styles.quote}>"Lezzet, sessiz bir lüks gibi. Her dilimde taze üretimin izi var."</Text>
        <Text style={styles.quoteMeta}>Pasta-Hane deneyimi</Text>
      </View>
    </View>
  );
}

function ProductsScreen({ categories, products, selectedCategory, onSelectCategory, onAdd }: {
  categories: Category[];
  products: Product[];
  selectedCategory: string | null;
  onSelectCategory: (id: string | null) => void;
  onAdd: (product: Product) => Promise<void>;
}): React.JSX.Element {
  return (
    <View>
      <Text style={styles.screenTitle}>Signature Cakes</Text>
      <Text style={styles.screenCopy}>Organik dokunuşlu premium pastalar ve günlük tatlılar.</Text>
      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>⌕</Text>
        <Text style={styles.searchPlaceholder}>Pasta, tart veya kruvasan ara</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        <Pressable style={[styles.filterChip, !selectedCategory && styles.filterChipActive]} onPress={() => onSelectCategory(null)}>
          <Text style={[styles.filterLabel, !selectedCategory && styles.filterLabelActive]}>Tümü</Text>
        </Pressable>
        {categories.map((category) => {
          const active = selectedCategory === category.id || selectedCategory === category.slug;
          return (
            <Pressable key={category.id} style={[styles.filterChip, active && styles.filterChipActive]} onPress={() => onSelectCategory(category.id)}>
              <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>{category.name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={styles.productGrid}>
        {products.map((product) => (
          <ProductCard key={product.id} product={product} onAdd={() => onAdd(product)} />
        ))}
      </View>
    </View>
  );
}

function ProductCard({ product, onAdd }: { product: Product; onAdd: () => void }): React.JSX.Element {
  const finalPrice = product.discountedPrice ?? product.price;
  return (
    <View style={styles.productCard}>
      <Image source={{ uri: productImage(product) }} style={styles.productImage} />
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{product.name}</Text>
        <Text style={styles.productDesc} numberOfLines={2}>{product.shortDescription ?? product.description ?? 'El işçiliğiyle hazırlanan günlük seçki.'}</Text>
        <View style={styles.productFooter}>
          <Text style={styles.productPrice}>{price(finalPrice)}</Text>
          <Pressable style={styles.addButton} onPress={onAdd}>
            <Text style={styles.addButtonText}>＋</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function CartScreen({ items, isLoggedIn, onLogin }: { items: CartItem[]; isLoggedIn: boolean; onLogin: () => void }): React.JSX.Element {
  return (
    <View>
      <Text style={styles.screenTitle}>Sepetim</Text>
      <Text style={styles.screenCopy}>Artisan seçkini gözden geçir.</Text>
      {items.map((item) => (
        <View key={item.id} style={styles.cartItem}>
          <Image source={{ uri: fallbackProducts.find((product) => product.id === item.product.id)?.images?.[0]?.url ?? fallbackImages.cake }} style={styles.cartImage} />
          <View style={styles.cartBody}>
            <Text style={styles.cartName}>{item.product.name}</Text>
            <Text style={styles.cartMeta}>Adet: {item.quantity}</Text>
            <Text style={styles.cartPrice}>{price(Number(item.unitPrice || item.product.discountedPrice || item.product.price) * item.quantity)}</Text>
          </View>
        </View>
      ))}
      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Ara toplam</Text>
          <Text style={styles.summaryValue}>{price(cartTotal(items))}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Teslimat</Text>
          <Text style={styles.summaryValue}>Ödeme adımında</Text>
        </View>
        <Pressable style={styles.primaryButton} onPress={() => { if (!isLoggedIn) onLogin(); }}>
          <Text style={styles.primaryButtonText}>{isLoggedIn ? 'Ödemeye geç' : 'Giriş yap ve devam et'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function OrdersScreen({ auth, onLogin, onLogout }: { auth: AuthState | null; onLogin: () => void; onLogout: () => void }): React.JSX.Element {
  if (!auth) {
    return (
      <View style={styles.emptyPanel}>
        <Text style={styles.screenTitle}>Hesabım</Text>
        <Text style={styles.screenCopy}>Siparişlerini ve adreslerini görmek için giriş yap.</Text>
        <Pressable style={styles.primaryButton} onPress={onLogin}>
          <Text style={styles.primaryButtonText}>Giriş yap</Text>
        </Pressable>
      </View>
    );
  }
  return (
    <View>
      <Text style={styles.screenTitle}>Merhaba, {auth.user.firstName}</Text>
      <Text style={styles.screenCopy}>Siparişler, adresler ve sadakat akışı mobil uygulamada burada toplanacak.</Text>
      {['ORD-20260522001', 'ORD-20260522002'].map((order, index) => (
        <View key={order} style={styles.orderCard}>
          <Text style={styles.orderNumber}>{order}</Text>
          <Text style={styles.orderStatus}>{index === 0 ? 'Hazırlanıyor' : 'Teslim edildi'}</Text>
        </View>
      ))}
      <Pressable style={styles.secondaryButton} onPress={onLogout}>
        <Text style={styles.secondaryButtonText}>Çıkış yap</Text>
      </Pressable>
    </View>
  );
}

function LoginScreen({ onLoggedIn }: { onLoggedIn: (auth: AuthState) => void }): React.JSX.Element {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      onLoggedIn(await login(phone, password));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Giriş başarısız.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.loginCard}>
      <Image source={{ uri: fallbackImages.pastry }} style={styles.loginImage} />
      <Text style={styles.screenTitle}>Welcome Back</Text>
      <Text style={styles.screenCopy}>Küratörlü seçkine ve sipariş geçmişine eriş.</Text>
      <TextInput style={styles.input} placeholder="Telefon" placeholderTextColor={colors.muted} keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
      <TextInput style={styles.input} placeholder="Şifre" placeholderTextColor={colors.muted} secureTextEntry value={password} onChangeText={setPassword} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.primaryButton} onPress={submit} disabled={busy}>
        <Text style={styles.primaryButtonText}>{busy ? 'Giriş yapılıyor' : 'Giriş yap'}</Text>
      </Pressable>
      <Text style={styles.loginHint}>Henüz hesabın yoksa web vitrininden kayıt olup mobil deneyime devam edebilirsin.</Text>
    </View>
  );
}

function SectionHeader({ title, action, onAction }: { title: string; action: string; onAction: () => void }): React.JSX.Element {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Pressable onPress={onAction}>
        <Text style={styles.sectionAction}>{action}</Text>
      </Pressable>
    </View>
  );
}

function BottomNav({ current, cartCount, onChange }: { current: Screen; cartCount: number; onChange: (screen: Screen) => void }): React.JSX.Element {
  const items: Array<{ key: Screen; label: string; icon: string }> = [
    { key: 'home', label: 'Vitrin', icon: '⌂' },
    { key: 'products', label: 'Ürünler', icon: '⌕' },
    { key: 'cart', label: `Sepet${cartCount ? ` ${cartCount}` : ''}`, icon: '◴' },
    { key: 'orders', label: 'Hesap', icon: '◎' },
  ];
  return (
    <View style={styles.bottomNav}>
      {items.map((item) => {
        const active = current === item.key;
        return (
          <Pressable key={item.key} style={[styles.navItem, active && styles.navItemActive]} onPress={() => onChange(item.key)}>
            <Text style={[styles.navIcon, active && styles.navTextActive]}>{item.icon}</Text>
            <Text style={[styles.navLabel, active && styles.navTextActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  addButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  addButtonText: { color: colors.surface, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 18 },
  app: { backgroundColor: colors.background, flex: 1 },
  bottomNav: {
    backgroundColor: colors.surface,
    borderTopColor: 'rgba(198,199,192,0.35)',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  brand: { color: colors.primary, fontFamily: 'PlayfairDisplay_700Bold', fontSize: 23, letterSpacing: 1.8, textTransform: 'uppercase' },
  cartBody: { flex: 1 },
  cartImage: { borderRadius: radii.md, height: 82, width: 82 },
  cartItem: { ...shadow, alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.xl, flexDirection: 'row', gap: spacing.lg, marginBottom: spacing.lg, padding: spacing.md },
  cartMeta: { color: colors.textMuted, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 12, marginTop: 4 },
  cartName: { color: colors.chocolate, fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 19 },
  cartPrice: { color: colors.accent, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, marginTop: 8 },
  categoryChip: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.xl, marginRight: spacing.md, minWidth: 92, padding: spacing.md, ...shadow },
  categoryIcon: { color: colors.gold, fontFamily: 'PlayfairDisplay_700Bold', fontSize: 26 },
  categoryLabel: { color: colors.text, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, marginTop: 8, textAlign: 'center' },
  categoryRow: { paddingBottom: spacing.md },
  emptyPanel: { ...shadow, backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing.xxl },
  error: { color: colors.error, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13, marginBottom: spacing.md },
  eyebrow: { color: colors.gold, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase' },
  filterChip: { backgroundColor: colors.surfaceLow, borderRadius: radii.pill, marginRight: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  filterChipActive: { backgroundColor: colors.chocolate },
  filterLabel: { color: colors.chocolate, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13 },
  filterLabelActive: { color: colors.background },
  filterRow: { paddingBottom: spacing.xl, paddingTop: spacing.md },
  header: { alignItems: 'center', backgroundColor: colors.background, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  headerIcon: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.pill, height: 42, justifyContent: 'center', width: 42, ...shadow },
  headerIconText: { color: colors.chocolate, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16 },
  headerSub: { color: colors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11, letterSpacing: 1.2, marginTop: -2, textTransform: 'uppercase' },
  hero: { borderRadius: radii.xl, height: 238, justifyContent: 'flex-end', marginBottom: spacing.section, overflow: 'hidden' },
  heroContent: { padding: spacing.xl },
  heroCopy: { color: 'rgba(255,255,255,0.9)', fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14, lineHeight: 20, marginBottom: spacing.lg, marginTop: spacing.sm, maxWidth: 260 },
  heroImage: { borderRadius: radii.xl },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(33,26,20,0.42)' },
  heroTitle: { color: colors.surface, fontFamily: 'PlayfairDisplay_700Bold', fontSize: 34, lineHeight: 39, marginTop: spacing.sm, maxWidth: 300 },
  input: { backgroundColor: colors.surfaceLow, borderRadius: radii.md, color: colors.text, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15, marginBottom: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: 14 },
  loading: { alignItems: 'center', backgroundColor: colors.background, flex: 1, justifyContent: 'center' },
  loadingText: { color: colors.chocolate, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: spacing.md },
  loginCard: { ...shadow, backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing.xl },
  loginHint: { color: colors.textMuted, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 12, lineHeight: 18, marginTop: spacing.md, textAlign: 'center' },
  loginImage: { borderRadius: radii.xl, height: 180, marginBottom: spacing.xl, width: '100%' },
  navIcon: { color: colors.textMuted, fontSize: 18, textAlign: 'center' },
  navItem: { alignItems: 'center', borderRadius: radii.pill, flex: 1, paddingVertical: spacing.sm },
  navItemActive: { backgroundColor: colors.surfaceLow },
  navLabel: { color: colors.textMuted, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10, marginTop: 2 },
  navTextActive: { color: colors.accent },
  notice: { backgroundColor: colors.chocolate, marginHorizontal: spacing.xl, marginTop: spacing.sm, borderRadius: radii.pill, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  noticeText: { color: colors.background, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, textAlign: 'center' },
  orderCard: { backgroundColor: colors.surface, borderRadius: radii.xl, marginBottom: spacing.md, padding: spacing.lg, ...shadow },
  orderNumber: { color: colors.chocolate, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 },
  orderStatus: { color: colors.textMuted, fontFamily: 'PlusJakartaSans_400Regular', marginTop: 6 },
  primaryButton: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: radii.pill, paddingHorizontal: spacing.xl, paddingVertical: 14 },
  primaryButtonText: { color: colors.surface, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, letterSpacing: 0.5 },
  productCard: { backgroundColor: colors.surface, borderRadius: radii.xl, marginBottom: spacing.lg, overflow: 'hidden', width: '48%', ...shadow },
  productDesc: { color: colors.textMuted, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 11, lineHeight: 16, marginTop: 5 },
  productFooter: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: spacing.md },
  productImage: { aspectRatio: 1, width: '100%' },
  productInfo: { padding: spacing.md },
  productName: { color: colors.text, fontFamily: 'PlayfairDisplay_700Bold', fontSize: 16, lineHeight: 20, minHeight: 40 },
  productPrice: { color: colors.accent, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14 },
  quote: { color: colors.chocolate, fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 22, fontStyle: 'italic', lineHeight: 30 },
  quoteMeta: { color: colors.gold, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, letterSpacing: 1.4, marginTop: spacing.lg, textTransform: 'uppercase' },
  quotePanel: { backgroundColor: colors.surfaceContainer, borderRadius: radii.xl, marginTop: spacing.section, padding: spacing.xxl },
  safeArea: { backgroundColor: colors.background, flex: 1 },
  screenCopy: { color: colors.textMuted, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14, lineHeight: 21, marginTop: 6 },
  screenTitle: { color: colors.primary, fontFamily: 'PlayfairDisplay_700Bold', fontSize: 32, lineHeight: 38 },
  scroll: { paddingBottom: 96, paddingHorizontal: spacing.xl, paddingTop: spacing.md },
  searchBox: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.pill, flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, paddingHorizontal: spacing.lg, paddingVertical: 14, ...shadow },
  searchIcon: { color: colors.gold, fontSize: 18 },
  searchPlaceholder: { color: colors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13 },
  secondaryButton: { alignItems: 'center', backgroundColor: colors.surfaceLow, borderRadius: radii.pill, marginTop: spacing.lg, paddingVertical: 14 },
  secondaryButtonText: { color: colors.chocolate, fontFamily: 'PlusJakartaSans_700Bold' },
  sectionAction: { color: colors.primary, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase' },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  sectionTitle: { color: colors.primary, fontFamily: 'PlayfairDisplay_700Bold', fontSize: 22 },
  summary: { backgroundColor: colors.chocolate, borderRadius: radii.xl, marginTop: spacing.xl, padding: spacing.xl },
  summaryLabel: { color: 'rgba(255,248,245,0.72)', fontFamily: 'PlusJakartaSans_400Regular', fontSize: 13 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  summaryValue: { color: colors.background, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14 },
});
