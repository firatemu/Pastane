import { memo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { typography } from '@/design-tokens';
import type { CartItem } from '@/types';
import { formatTry } from '@/utils/format';
import { productImageUrl } from '@/utils/product-image';
import { productLabel } from '@/utils/product-label';
import { colors, radii, spacing } from '@/theme';

function CartLineItemInner({
  item,
  busy,
  onDecrease,
  onIncrease,
  onRemove,
}: {
  item: CartItem;
  busy?: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
  onRemove: () => void;
}): React.JSX.Element {
  return (
    <View style={styles.card}>
      <Pressable accessibilityLabel="Kaldır" hitSlop={8} onPress={onRemove} style={styles.removeBtn}>
        <MaterialCommunityIcons color={colors.muted} name="close" size={18} />
      </Pressable>
      {productImageUrl(item.product) ? (
        <Image source={{ uri: productImageUrl(item.product)! }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]}>
          <MaterialCommunityIcons color={colors.primary} name="image-off-outline" size={22} />
        </View>
      )}
      <View style={styles.body}>
        <Text numberOfLines={2} style={styles.name}>
          {productLabel(item.product)}
        </Text>
        {item.options?.length ? (
          <Text numberOfLines={1} style={styles.options}>
            {item.options.map((o) => o.option.name).join(', ')}
          </Text>
        ) : null}
        {item.customNote ? <Text style={styles.note}>Not: {item.customNote}</Text> : null}
        <View style={styles.footer}>
          <Text style={styles.unit}>{formatTry(item.unitPrice)}</Text>
          <View style={styles.stepper}>
            <Pressable disabled={busy || item.quantity <= 1} onPress={onDecrease} style={styles.stepBtn}>
              <MaterialCommunityIcons color={colors.primary} name="minus" size={16} />
            </Pressable>
            <Text style={styles.qty}>{item.quantity}</Text>
            <Pressable disabled={busy} onPress={onIncrease} style={styles.stepBtn}>
              <MaterialCommunityIcons color={colors.primary} name="plus" size={16} />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

export const CartLineItem = memo(CartLineItemInner);

export function CartSummarySticky({
  itemCount,
  onCheckout,
  disabled,
}: {
  itemCount: number;
  onCheckout: () => void;
  disabled?: boolean;
}): React.JSX.Element {
  return (
    <View style={styles.sticky}>
      <View style={styles.summaryInner}>
        <View style={[styles.row, styles.totalRow]}>
          <Text style={styles.totalLabel}>{itemCount} ürün</Text>
          <Text style={styles.totalValue}>Sunucuda doğrulanır</Text>
        </View>
        <Pressable disabled={disabled} onPress={onCheckout} style={[styles.checkoutBtn, disabled && styles.checkoutDisabled]}>
          <Text style={styles.checkoutText}>Ödemeye geç</Text>
          <MaterialCommunityIcons color={colors.onPrimary} name="arrow-right" size={18} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, paddingRight: spacing.lg },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderColor: `${colors.outlineVariant}50`,
    borderRadius: radii.xl,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    position: 'relative',
  },
  checkoutBtn: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    marginTop: spacing.md,
    paddingVertical: 14,
  },
  checkoutDisabled: { opacity: 0.5 },
  checkoutText: { ...typography.labelLg, color: colors.onPrimary, fontSize: 13 },
  footer: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  label: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  name: { ...typography.headlineSm, color: colors.primary, fontSize: 17 },
  note: { ...typography.bodyMd, color: colors.onSurfaceVariant, fontSize: 11, fontStyle: 'italic', marginTop: 2 },
  options: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: 2, textTransform: 'none' },
  qty: { ...typography.bodyMd, fontFamily: typography.price.fontFamily, minWidth: 24, textAlign: 'center' },
  removeBtn: { position: 'absolute', right: 8, top: 8, zIndex: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  stepBtn: {
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.pill,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  stepper: {
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderColor: `${colors.outlineVariant}30`,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 4,
  },
  sticky: {
    backgroundColor: colors.background,
    borderTopColor: `${colors.outlineVariant}40`,
    borderTopWidth: StyleSheet.hairlineWidth,
    bottom: 0,
    left: 0,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.md,
    position: 'absolute',
    right: 0,
  },
  summaryInner: {
    backgroundColor: colors.surfaceContainerLowest,
    borderColor: `${colors.outlineVariant}30`,
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.lg,
  },
  thumb: { borderRadius: radii.lg, height: 96, width: 96 },
  thumbPlaceholder: { alignItems: 'center', backgroundColor: colors.surfaceContainerLow, justifyContent: 'center' },
  totalLabel: { ...typography.headlineSm, color: colors.primary, fontSize: 18 },
  totalRow: { borderTopColor: `${colors.outlineVariant}40`, borderTopWidth: 1, marginBottom: 0, marginTop: spacing.sm, paddingTop: spacing.sm },
  totalValue: { ...typography.bodyMd, color: colors.onSurfaceVariant, fontFamily: typography.price.fontFamily },
  unit: { ...typography.bodyMd, color: colors.onSurface },
  value: { ...typography.bodyMd, color: colors.onSurface },
});
