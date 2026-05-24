import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { typography } from '@/design-tokens';
import { colors, radii, shadow, spacing } from '@/theme';

export function Screen({ children, title, subtitle }: { children: ReactNode; title?: string; subtitle?: string }): React.JSX.Element {
  return (
    <View style={styles.screen}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

export function PrimaryButton({ label, onPress, disabled, busy }: { label: string; onPress: () => void; disabled?: boolean; busy?: boolean }): React.JSX.Element {
  return (
    <Pressable style={[styles.primaryBtn, (disabled || busy) && styles.btnDisabled]} onPress={onPress} disabled={disabled || busy}>
      {busy ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.primaryBtnText}>{label}</Text>}
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  onPress,
  disabled,
  busy,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
}): React.JSX.Element {
  const dim = !!(disabled || busy);
  return (
    <Pressable style={[styles.secondaryBtn, dim && styles.btnDisabled]} onPress={onPress} disabled={dim}>
      {busy ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.secondaryBtnText}>{label}</Text>}
    </Pressable>
  );
}

export function Field(props: TextInputProps & { label?: string; error?: string; variant?: 'filled' | 'underline' }): React.JSX.Element {
  const { label, error, variant = 'filled', style, ...inputProps } = props;
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.muted}
        style={[variant === 'underline' ? styles.inputUnderline : styles.input, style]}
        {...inputProps}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function EmptyState({ message, actionLabel, onAction }: { message: string; actionLabel?: string; onAction?: () => void }): React.JSX.Element {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} style={styles.emptyAction}>
          <Text style={styles.emptyActionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function ErrorBanner({ message, onDismiss }: { message: string; onDismiss?: () => void }): React.JSX.Element {
  return (
    <Pressable style={styles.banner} onPress={onDismiss}>
      <Text style={styles.bannerText}>{message}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: { backgroundColor: colors.errorContainer, borderRadius: radii.lg, marginBottom: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  bannerText: { color: colors.error, fontFamily: typography.bodySemi.fontFamily, fontSize: 13, textAlign: 'center' },
  btnDisabled: { opacity: 0.6 },
  empty: { ...shadow, backgroundColor: colors.surfaceContainerLowest, borderRadius: radii.xl, padding: spacing.xxl },
  emptyAction: { marginTop: spacing.lg },
  emptyActionText: { ...typography.labelLg, color: colors.primary, textAlign: 'center' },
  emptyText: { ...typography.bodyMd, color: colors.onSurfaceVariant, textAlign: 'center' },
  error: { color: colors.error, fontFamily: typography.bodySemi.fontFamily, fontSize: 12, marginTop: 4 },
  field: { marginBottom: spacing.md },
  input: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.md,
    color: colors.onSurface,
    fontFamily: typography.bodySemi.fontFamily,
    fontSize: 15,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },
  inputUnderline: {
    borderBottomColor: colors.outlineVariant,
    borderBottomWidth: 1,
    color: colors.onSurface,
    fontFamily: typography.body.fontFamily,
    fontSize: 16,
    paddingBottom: spacing.sm,
    paddingTop: spacing.sm,
  },
  label: { ...typography.labelSm, color: colors.onSurfaceVariant, marginBottom: 6, textTransform: 'none' },
  primaryBtn: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
  },
  primaryBtnText: { ...typography.labelLg, color: colors.onPrimary, fontSize: 13 },
  screen: { flex: 1 },
  secondaryBtn: {
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.lg,
    marginTop: spacing.md,
    paddingVertical: 14,
  },
  secondaryBtnText: { ...typography.labelLg, color: colors.primary, fontSize: 13 },
  subtitle: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginBottom: spacing.lg, marginTop: 6 },
  title: { ...typography.displayLg, color: colors.primary },
});
