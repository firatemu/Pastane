import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
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
      {busy ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.primaryBtnText}>{label}</Text>}
    </Pressable>
  );
}

export function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }): React.JSX.Element {
  return (
    <Pressable style={styles.secondaryBtn} onPress={onPress}>
      <Text style={styles.secondaryBtnText}>{label}</Text>
    </Pressable>
  );
}

export function Field(props: TextInputProps & { label?: string; error?: string }): React.JSX.Element {
  const { label, error, ...inputProps } = props;
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput placeholderTextColor={colors.muted} style={styles.input} {...inputProps} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function EmptyState({ message }: { message: string }): React.JSX.Element {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{message}</Text>
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
  banner: { backgroundColor: colors.chocolate, borderRadius: radii.pill, marginBottom: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  bannerText: { color: colors.background, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, textAlign: 'center' },
  btnDisabled: { opacity: 0.6 },
  empty: { ...shadow, backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing.xxl },
  emptyText: { color: colors.textMuted, fontFamily: 'PlusJakartaSans_400Regular', textAlign: 'center' },
  error: { color: colors.error, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, marginTop: 4 },
  field: { marginBottom: spacing.md },
  input: { backgroundColor: colors.surfaceLow, borderRadius: radii.md, color: colors.text, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15, paddingHorizontal: spacing.lg, paddingVertical: 14 },
  label: { color: colors.textMuted, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, marginBottom: 6 },
  primaryBtn: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: radii.pill, paddingHorizontal: spacing.xl, paddingVertical: 14 },
  primaryBtnText: { color: colors.surface, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14 },
  screen: { flex: 1 },
  secondaryBtn: { alignItems: 'center', backgroundColor: colors.surfaceLow, borderRadius: radii.pill, marginTop: spacing.md, paddingVertical: 14 },
  secondaryBtnText: { color: colors.chocolate, fontFamily: 'PlusJakartaSans_700Bold' },
  subtitle: { color: colors.textMuted, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14, lineHeight: 21, marginBottom: spacing.lg, marginTop: 6 },
  title: { color: colors.primary, fontFamily: 'PlayfairDisplay_700Bold', fontSize: 32, lineHeight: 38 },
});
