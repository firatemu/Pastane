import { memo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { fallbackImages } from '@/data/fallback';
import { typography } from '@/design-tokens';
import type { Product } from '@/types';
import { formatTry } from '@/utils/format';
import { productImageUrl } from '@/utils/product-image';
import { productLabel } from '@/utils/product-label';
import { colors, radii, shadow, spacing } from '@/theme';

function ProductCardInner({
  product,
  onPress,
  onAdd,
  compact,
}: {
  product: Product;
  onPress?: () => void;
  onAdd?: () => void;
  compact?: boolean;
}): React.JSX.Element {
  const finalPrice = product.discountedPrice ?? product.price;
  const [imageUri, setImageUri] = useState(productImageUrl(product));

  return (
    <Pressable style={[styles.card, compact && styles.cardCompact]} onPress={onPress}>
      <View style={styles.imageWrap}>
        <Image source={{ uri: imageUri }} style={styles.image} onError={() => setImageUri(fallbackImages.pastry)} />
        {onAdd ? (
          <Pressable
            accessibilityLabel="Sepete ekle"
            hitSlop={6}
            onPress={(e) => {
              e.stopPropagation?.();
              onAdd();
            }}
            style={styles.addFab}
          >
            <MaterialCommunityIcons color={colors.onPrimary} name="plus" size={20} />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.body}>
        <Text numberOfLines={2} style={styles.name}>
          {productLabel(product)}
        </Text>
        <Text style={styles.price}>{formatTry(finalPrice)}</Text>
      </View>
    </Pressable>
  );
}

export const ProductCard = memo(ProductCardInner);

export function CategoryChipRow({
  categories,
  selectedId,
  onSelect,
}: {
  categories: { id: string; name: string }[];
  selectedId?: string;
  onSelect: (id?: string) => void;
}): React.JSX.Element {
  return (
    <View style={styles.chipRow}>
      {categories.map((c) => {
        const active = selectedId === c.id;
        return (
          <Pressable key={c.id} onPress={() => onSelect(active ? undefined : c.id)} style={[styles.chip, active && styles.chipActive]}>
            <Text numberOfLines={1} style={[styles.chipText, active && styles.chipTextActive]}>
              {c.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  addFab: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    bottom: 6,
    elevation: 3,
    height: 32,
    justifyContent: 'center',
    position: 'absolute',
    right: 6,
    shadowColor: colors.chocolate,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    width: 32,
  },
  body: { paddingHorizontal: 4, paddingTop: spacing.sm },
  card: { marginBottom: spacing.lg, width: '48%', ...shadow },
  cardCompact: { marginBottom: spacing.md },
  chip: {
    backgroundColor: colors.surfaceContainerLow,
    borderColor: colors.outlineVariant,
    borderRadius: radii.pill,
    borderWidth: 1,
    marginRight: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipRow: { flexDirection: 'row', flexWrap: 'nowrap', paddingVertical: spacing.sm },
  chipText: { ...typography.labelSm, color: colors.onSurface },
  chipTextActive: { color: colors.onPrimary },
  image: { height: '100%', width: '100%' },
  imageWrap: {
    aspectRatio: 1,
    backgroundColor: colors.surfaceContainerLow,
    borderColor: `${colors.outlineVariant}50`,
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
    width: '100%',
  },
  name: { ...typography.bodyMd, color: colors.onSurface, fontFamily: typography.headlineSm.fontFamily, fontSize: 15, minHeight: 40 },
  price: { ...typography.price, color: colors.primary, marginTop: 4 },
});
