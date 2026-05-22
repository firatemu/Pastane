import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { formatTry } from '@/utils/format';
import { productImageUrl } from '@/utils/product-image';
import type { Product } from '@/types';
import { colors, radii, shadow, spacing } from '@/theme';

export function ProductCard({
  product,
  onPress,
  onAdd,
}: {
  product: Product;
  onPress?: () => void;
  onAdd?: () => void;
}): React.JSX.Element {
  const finalPrice = product.discountedPrice ?? product.price;
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <Image source={{ uri: productImageUrl(product) }} style={styles.image} />
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
        <Text style={styles.desc} numberOfLines={2}>{product.shortDescription ?? product.description ?? 'Günlük seçki'}</Text>
        <View style={styles.footer}>
          <Text style={styles.price}>{formatTry(finalPrice)}</Text>
          {onAdd ? (
            <Pressable style={styles.add} onPress={(e) => { e.stopPropagation?.(); onAdd(); }}>
              <Text style={styles.addText}>＋</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  add: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: radii.pill, height: 34, justifyContent: 'center', width: 34 },
  addText: { color: colors.surface, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 18 },
  body: { padding: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: radii.xl, marginBottom: spacing.lg, overflow: 'hidden', width: '48%', ...shadow },
  desc: { color: colors.textMuted, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 11, lineHeight: 16, marginTop: 5 },
  footer: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
  image: { aspectRatio: 1, width: '100%' },
  name: { color: colors.text, fontFamily: 'PlayfairDisplay_700Bold', fontSize: 16, lineHeight: 20, minHeight: 40 },
  price: { color: colors.accent, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14 },
});
