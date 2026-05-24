import { StyleSheet, Text, View } from 'react-native';
import { typography } from '@/design-tokens';
import { orderStatusTextClass, statusLabel } from '@/utils/order-status';
import type { Order } from '@/types';
import { formatDate, formatTry } from '@/utils/format';
import { colors, radii, shadow, spacing } from '@/theme';

export function StatusBadge({ status }: { status: string }): React.JSX.Element {
  const colorClass = orderStatusTextClass(status);
  return (
    <Text style={[styles.badge, { color: colorClass.color }]}>
      {statusLabel(status)}
    </Text>
  );
}

export function OrderRow({ order }: { order: Order }): React.JSX.Element {
  return (
    <View style={styles.row}>
      <View style={styles.head}>
        <Text style={styles.no}>{order.orderNumber}</Text>
        <StatusBadge status={order.status} />
      </View>
      <Text style={styles.meta}>
        {formatDate(order.createdAt)} · {formatTry(order.grandTotal)}
      </Text>
      <Text style={styles.meta}>{order.deliveryType === 'HOME_DELIVERY' ? 'Adrese teslim' : 'Mağazadan teslim'}</Text>
    </View>
  );
}

export function OrderTimeline({ currentStatus, history }: { currentStatus: string; history?: { status: string; createdAt: string }[] }): React.JSX.Element {
  const steps = history?.length
    ? history.map((h) => ({ status: h.status, at: h.createdAt }))
    : [{ status: currentStatus, at: '' }];

  return (
    <View style={styles.timeline}>
      {steps.map((step, i) => (
        <View key={`${step.status}-${i}`} style={styles.step}>
          <View style={[styles.dot, step.status === currentStatus && styles.dotActive]} />
          <View style={styles.stepBody}>
            <Text style={styles.stepLabel}>{statusLabel(step.status)}</Text>
            {step.at ? <Text style={styles.stepTime}>{formatDate(step.at)}</Text> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { ...typography.labelSm, textTransform: 'none' },
  dot: { backgroundColor: colors.outlineVariant, borderRadius: 6, height: 12, marginTop: 4, width: 12 },
  dotActive: { backgroundColor: colors.primary },
  head: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  meta: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginTop: 4 },
  no: { ...typography.bodyMd, color: colors.primary, fontFamily: typography.price.fontFamily },
  row: { ...shadow, backgroundColor: colors.surfaceContainerLowest, borderRadius: radii.xl, marginBottom: spacing.md, padding: spacing.lg },
  step: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  stepBody: { flex: 1 },
  stepLabel: { ...typography.bodyMd, color: colors.onSurface, fontFamily: typography.price.fontFamily },
  stepTime: { ...typography.bodyMd, color: colors.onSurfaceVariant, fontSize: 12, marginTop: 2 },
  timeline: { marginTop: spacing.md },
});
