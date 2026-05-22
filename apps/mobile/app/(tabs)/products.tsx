import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchCategories, fetchProducts } from '@/api/client';
import { ProductCard } from '@/components/product-card';
import { useAuth } from '@/context/auth-context';
import { useCart } from '@/context/cart-context';
import { fallbackCategories, fallbackProducts } from '@/data/fallback';
import type { Category, Product } from '@/types';
import { colors, radii, spacing } from '@/theme';

export default function ProductsScreen(): React.JSX.Element {
  const router = useRouter();
  const { categoryId } = useLocalSearchParams<{ categoryId?: string }>();
  const { auth } = useAuth();
  const { addItem } = useCart();
  const [categories, setCategories] = useState<Category[]>(fallbackCategories);
  const [products, setProducts] = useState<Product[]>(fallbackProducts);
  const [selected, setSelected] = useState<string | null>(categoryId ?? null);

  useEffect(() => {
    if (categoryId) setSelected(categoryId);
  }, [categoryId]);

  useEffect(() => {
    void fetchCategories().then((c) => { if (c.length) setCategories(c); });
  }, []);

  useEffect(() => {
    void fetchProducts({ categoryId: selected ?? undefined, limit: 50 }).then((p) => {
      if (p.length) setProducts(p);
    });
  }, [selected]);

  const filtered = useMemo(() => {
    if (!selected) return products;
    return products.filter((p) => p.category?.id === selected || p.category?.slug === selected);
  }, [products, selected]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Ürünler</Text>
        <Text style={styles.copy}>Günlük pastane seçkimiz</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          <Pressable style={[styles.filter, !selected && styles.filterActive]} onPress={() => setSelected(null)}>
            <Text style={[styles.filterText, !selected && styles.filterTextActive]}>Tümü</Text>
          </Pressable>
          {categories.map((c) => {
            const active = selected === c.id || selected === c.slug;
            return (
              <Pressable key={c.id} style={[styles.filter, active && styles.filterActive]} onPress={() => setSelected(c.id)}>
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{c.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={styles.grid}>
          {filtered.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              onPress={() => router.push(`/product/${p.slug}`)}
              onAdd={() => {
                if (!auth) {
                  router.push('/login');
                  return;
                }
                void addItem(p.id);
              }}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  copy: { color: colors.textMuted, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14, marginBottom: spacing.lg },
  filter: { backgroundColor: colors.surfaceLow, borderRadius: radii.pill, marginRight: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  filterActive: { backgroundColor: colors.chocolate },
  filterText: { color: colors.chocolate, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13 },
  filterTextActive: { color: colors.background },
  filters: { marginBottom: spacing.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  safe: { backgroundColor: colors.background, flex: 1 },
  scroll: { padding: spacing.xl, paddingBottom: 32 },
  title: { color: colors.primary, fontFamily: 'PlayfairDisplay_700Bold', fontSize: 32 },
});
