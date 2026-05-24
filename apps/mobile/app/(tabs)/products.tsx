import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { fetchCategories, fetchProducts } from '@/api/client';
import { ProductCard } from '@/components/catalog/product-card';
import { ProductGridSkeleton } from '@/components/feedback/skeleton';
import { AppHeader } from '@/components/layout/app-header';
import { SafeScreen } from '@/components/layout/safe-screen';
import { ErrorBanner } from '@/components/ui';
import { useAuth } from '@/context/auth-context';
import { useCart } from '@/context/cart-context';
import { typography } from '@/design-tokens';
import type { Category, Product } from '@/types';
import { hapticLight, hapticSuccess } from '@/utils/haptics';
import { hasRequiredOptions } from '@/utils/product-options';
import { colors, radii, spacing } from '@/theme';

export default function ProductsScreen(): React.JSX.Element {
  const router = useRouter();
  const { categoryId } = useLocalSearchParams<{ categoryId?: string }>();
  const { auth } = useAuth();
  const { addItem } = useCart();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<string | null>(categoryId ?? null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (categoryId) setSelected(categoryId);
  }, [categoryId]);

  useEffect(() => {
    void fetchCategories().then(setCategories).catch(() => setNotice('Kategoriler yüklenemedi.'));
  }, []);

  const load = useCallback(async (pageNum = 1, append = false) => {
    if (!append) setLoading(true);
    try {
      const rows = await fetchProducts({
        categoryId: selected ?? undefined,
        search: search.trim() || undefined,
        page: pageNum,
        limit: 20,
      });
      setProducts((prev) => (append ? [...prev, ...rows] : rows));
      setPage(pageNum);
    } catch {
      setNotice('Ürünler yüklenemedi.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, selected]);

  useEffect(() => {
    void load(1, false);
  }, [load]);

  const filters = useMemo(() => [{ id: '', name: 'Tümü' }, ...categories], [categories]);

  async function handleAdd(product: Product): Promise<void> {
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
      setNotice(`${product.name} sepete eklendi.`);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Sepete eklenemedi.');
    }
  }

  return (
    <SafeScreen edges={['top']} padded={false}>
      <AppHeader showMenu showSearch onSearchPress={() => undefined} title="VİTRİN" />
      <View style={styles.searchWrap}>
        <MaterialCommunityIcons color={colors.muted} name="magnify" size={20} />
        <TextInput
          placeholder="Ürün ara…"
          placeholderTextColor={colors.muted}
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => void load(1, false)}
          returnKeyType="search"
        />
      </View>
      {notice ? <View style={styles.noticePad}><ErrorBanner message={notice} onDismiss={() => setNotice(null)} /></View> : null}
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(1, false); }} tintColor={colors.primary} />}
        ListHeaderComponent={
          <>
            <Text style={styles.title}>Ürünler</Text>
            <Text style={styles.copy}>Günlük pastane seçkimiz</Text>
            <FlatList
              horizontal
              data={filters}
              keyExtractor={(item) => item.id || 'all'}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filters}
              renderItem={({ item }) => {
                const active = item.id ? selected === item.id : !selected;
                return (
                  <Pressable
                    style={[styles.filter, active && styles.filterActive]}
                    onPress={() => {
                      void hapticLight();
                      setSelected(item.id || null);
                    }}
                  >
                    <Text style={[styles.filterText, active && styles.filterTextActive]}>{item.name}</Text>
                  </Pressable>
                );
              }}
            />
            {loading && !products.length ? <ProductGridSkeleton /> : null}
          </>
        }
        ListEmptyComponent={!loading ? <Text style={styles.empty}>Bu kategoride ürün bulunamadı.</Text> : null}
        renderItem={({ item }) => (
          <ProductCard product={item} onPress={() => router.push(`/product/${item.slug}`)} onAdd={() => void handleAdd(item)} />
        )}
        onEndReached={() => {
          if (!loading && products.length >= page * 20) void load(page + 1, true);
        }}
        onEndReachedThreshold={0.4}
      />
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  copy: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginBottom: spacing.lg, paddingHorizontal: spacing.screenHorizontal },
  empty: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginTop: spacing.lg, textAlign: 'center' },
  filter: { backgroundColor: colors.surfaceContainerLow, borderRadius: radii.pill, marginRight: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: 8 },
  filterActive: { backgroundColor: colors.primary },
  filterText: { ...typography.labelSm, color: colors.onSurface, textTransform: 'none' },
  filterTextActive: { color: colors.onPrimary },
  filters: { marginBottom: spacing.lg, paddingHorizontal: spacing.screenHorizontal },
  list: { paddingBottom: 32 },
  noticePad: { paddingHorizontal: spacing.screenHorizontal },
  row: { justifyContent: 'space-between', paddingHorizontal: spacing.screenHorizontal },
  searchInput: { ...typography.bodyMd, color: colors.onSurface, flex: 1, marginLeft: spacing.sm, paddingVertical: 0 },
  searchWrap: {
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.lg,
    flexDirection: 'row',
    marginBottom: spacing.md,
    marginHorizontal: spacing.screenHorizontal,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  title: { ...typography.displayLg, color: colors.primary, fontSize: 28, paddingHorizontal: spacing.screenHorizontal },
});
