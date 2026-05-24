import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ImageBackground, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import { Field, PrimaryButton, SecondaryButton } from '@/components/ui';
import { useAuth } from '@/context/auth-context';
import { fallbackImages } from '@/data/fallback';
import { typography } from '@/design-tokens';
import { loginSchema } from '@/schemas/forms';
import { colors, radii, spacing } from '@/theme';

export default function LoginScreen(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(): Promise<void> {
    const digits = phone.replace(/\D/g, '');
    const parsed = loginSchema.safeParse({ phone: digits, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Giriş bilgileri geçersiz.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await login(parsed.data.phone, parsed.data.password);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Giriş başarısız.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.root}>
      <ImageBackground source={{ uri: fallbackImages.hero }} style={styles.hero}>
        <View style={styles.heroOverlay} />
        <Pressable accessibilityLabel="Geri" hitSlop={8} onPress={() => router.back()} style={[styles.backBtn, { top: insets.top + 8 }]}>
          <MaterialCommunityIcons color={colors.primary} name="arrow-left" size={22} />
        </Pressable>
      </ImageBackground>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetWrap}>
        <ScrollView contentContainerStyle={[styles.sheet, { paddingBottom: insets.bottom + spacing.xxl }]} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Tekrar hoş geldiniz</Text>
          <Text style={styles.subtitle}>Siparişlerinize ve sepetinize erişin.</Text>
          <Field label="Telefon" keyboardType="phone-pad" value={phone} onChangeText={setPhone} placeholder="5XXXXXXXXX" variant="underline" />
          <Field label="Şifre" secureTextEntry value={password} onChangeText={setPassword} placeholder="••••••••" variant="underline" />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton label="Giriş yap" onPress={() => void submit()} busy={busy} />
          <SecondaryButton label="Kayıt ol" onPress={() => router.replace('/register')} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  backBtn: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: radii.pill, height: 40, justifyContent: 'center', left: spacing.screenHorizontal, position: 'absolute', width: 40 },
  error: { color: colors.error, fontFamily: typography.bodySemi.fontFamily, fontSize: 13, marginBottom: spacing.md },
  hero: { height: 280, width: '100%' },
  heroOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.15)' },
  root: { backgroundColor: colors.surface, flex: 1 },
  sheet: { paddingHorizontal: spacing.xxl, paddingTop: spacing.xxl },
  sheetWrap: { backgroundColor: colors.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, flex: 1, marginTop: -24 },
  subtitle: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginBottom: spacing.xxl },
  title: { ...typography.displayLg, color: colors.primary, fontSize: 28, marginBottom: spacing.sm },
});
