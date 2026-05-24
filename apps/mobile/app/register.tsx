import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ImageBackground, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Field, PrimaryButton } from '@/components/ui';
import { useAuth } from '@/context/auth-context';
import { fallbackImages } from '@/data/fallback';
import { typography } from '@/design-tokens';
import { registerSchema } from '@/schemas/forms';
import { colors, radii, spacing } from '@/theme';

export default function RegisterScreen(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(): Promise<void> {
    const digits = phone.replace(/\D/g, '');
    const parsed = registerSchema.safeParse({ firstName, lastName, phone: digits, email: email.trim() || '', password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Kayıt bilgileri geçersiz.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await register({
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        phone: parsed.data.phone,
        email: parsed.data.email || undefined,
        password: parsed.data.password,
      });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kayıt başarısız.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.root}>
      <ImageBackground source={{ uri: fallbackImages.pastry }} style={styles.hero}>
        <View style={styles.heroOverlay} />
        <Pressable accessibilityLabel="Geri" hitSlop={8} onPress={() => router.back()} style={[styles.backBtn, { top: insets.top + 8 }]}>
          <MaterialCommunityIcons color={colors.primary} name="arrow-left" size={22} />
        </Pressable>
      </ImageBackground>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetWrap}>
        <ScrollView contentContainerStyle={[styles.sheet, { paddingBottom: insets.bottom + spacing.xxl }]} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Hesap oluştur</Text>
          <Text style={styles.subtitle}>Pastane müşteri hesabınızı birkaç adımda açın.</Text>
          <Field label="Ad" value={firstName} onChangeText={setFirstName} variant="underline" />
          <Field label="Soyad" value={lastName} onChangeText={setLastName} variant="underline" />
          <Field label="Telefon" keyboardType="phone-pad" value={phone} onChangeText={setPhone} variant="underline" />
          <Field label="E-posta (isteğe bağlı)" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} variant="underline" />
          <Field label="Şifre" secureTextEntry value={password} onChangeText={setPassword} variant="underline" />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton label="Kayıt ol" onPress={() => void submit()} busy={busy} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  backBtn: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: radii.pill, height: 40, justifyContent: 'center', left: spacing.screenHorizontal, position: 'absolute', width: 40 },
  error: { color: colors.error, fontFamily: typography.bodySemi.fontFamily, fontSize: 13, marginBottom: spacing.md },
  hero: { height: 220, width: '100%' },
  heroOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.12)' },
  root: { backgroundColor: colors.surface, flex: 1 },
  sheet: { paddingHorizontal: spacing.xxl, paddingTop: spacing.xxl },
  sheetWrap: { backgroundColor: colors.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, flex: 1, marginTop: -24 },
  subtitle: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginBottom: spacing.lg },
  title: { ...typography.displayLg, color: colors.primary, fontSize: 28, marginBottom: spacing.sm },
});
