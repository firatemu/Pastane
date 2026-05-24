import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { changePassword, fetchMe, updateMe } from '@/api/client';
import { AppHeader } from '@/components/layout/app-header';
import { SafeScreen } from '@/components/layout/safe-screen';
import { Field, PrimaryButton, Screen } from '@/components/ui';
import { useAuth } from '@/context/auth-context';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { changePasswordSchema } from '@/schemas/forms';
import { colors, radii, spacing } from '@/theme';

export default function ProfileScreen(): React.JSX.Element {
  const router = useRouter();
  const { auth, setUser } = useAuth();
  const { ready } = useRequireAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    setLoading(true);
    void fetchMe()
      .then((user) => {
        setFirstName(user.firstName);
        setLastName(user.lastName);
        setEmail(user.email ?? '');
        setUser(user);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Profil yüklenemedi.'))
      .finally(() => setLoading(false));
  }, [ready, setUser]);

  async function submitProfile(): Promise<void> {
    if (!firstName.trim() || !lastName.trim()) {
      setError('Ad ve soyad zorunlu.');
      return;
    }
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Geçersiz e-posta.');
      return;
    }
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const user = await updateMe({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim() || null });
      setUser(user);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Profil güncellenemedi.');
    } finally {
      setBusy(false);
    }
  }

  async function submitPassword(): Promise<void> {
    const parsed = changePasswordSchema.safeParse({ currentPassword, newPassword, confirmPassword });
    if (!parsed.success) {
      setPasswordError(parsed.error.issues[0]?.message ?? 'Şifre bilgileri geçersiz.');
      return;
    }
    setPasswordBusy(true);
    setPasswordError(null);
    setPasswordSaved(false);
    try {
      await changePassword({
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSaved(true);
    } catch (e) {
      setPasswordError(e instanceof Error ? e.message : 'Şifre değiştirilemedi.');
    } finally {
      setPasswordBusy(false);
    }
  }

  if (!ready || loading) {
    return (
      <SafeScreen edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen edges={['top']} padded={false}>
      <AppHeader showBack showMenu title="PROFİL" onBackPress={() => router.back()} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Screen title="Profil bilgilerim" subtitle={`${auth?.user?.phone ?? ''}`}>
            <Field label="Ad" value={firstName} onChangeText={setFirstName} />
            <Field label="Soyad" value={lastName} onChangeText={setLastName} />
            <Field label="E-posta" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {saved ? <Text style={styles.saved}>Profil bilgileriniz güncellendi.</Text> : null}
            <PrimaryButton label="Profili kaydet" onPress={() => void submitProfile()} busy={busy} />
          </Screen>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Şifre değiştir</Text>
            <Field label="Mevcut şifre" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry />
            <Field label="Yeni şifre" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
            <Field label="Yeni şifre (tekrar)" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
            {passwordError ? <Text style={styles.error}>{passwordError}</Text> : null}
            {passwordSaved ? <Text style={styles.saved}>Şifreniz güncellendi.</Text> : null}
            <PrimaryButton label="Şifreyi güncelle" onPress={() => void submitPassword()} busy={passwordBusy} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  error: { color: colors.error, fontFamily: 'PlusJakartaSans_600SemiBold', marginBottom: spacing.md },
  flex: { flex: 1 },
  saved: { color: colors.accent, fontFamily: 'PlusJakartaSans_600SemiBold', marginBottom: spacing.md },
  scroll: { padding: spacing.xl, paddingBottom: 40 },
  section: { backgroundColor: colors.surface, borderRadius: radii.xl, marginTop: spacing.xl, padding: spacing.lg },
  sectionTitle: { color: colors.primary, fontFamily: 'PlayfairDisplay_700Bold', fontSize: 22, marginBottom: spacing.md },
});
