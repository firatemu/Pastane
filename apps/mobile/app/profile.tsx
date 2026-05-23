import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchMe, updateMe } from '@/api/client';
import { Field, PrimaryButton, Screen } from '@/components/ui';
import { useAuth } from '@/context/auth-context';
import { colors, spacing } from '@/theme';

export default function ProfileScreen(): React.JSX.Element {
  const router = useRouter();
  const { auth, refreshSession } = useAuth();
  const [firstName, setFirstName] = useState(auth?.user.firstName ?? '');
  const [lastName, setLastName] = useState(auth?.user.lastName ?? '');
  const [email, setEmail] = useState(auth?.user.email ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void fetchMe()
      .then((user) => {
        setFirstName(user.firstName);
        setLastName(user.lastName);
        setEmail(user.email ?? '');
      })
      .catch(() => {
        if (!auth) router.replace('/login');
      });
  }, [auth, router]);

  async function submit(): Promise<void> {
    if (!firstName.trim() || !lastName.trim()) {
      setError('Ad ve soyad zorunlu.');
      return;
    }
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Geçersiz email.');
      return;
    }
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await updateMe({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim() || null });
      await refreshSession();
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Profil güncellenemedi.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Screen title="Profil bilgilerim" subtitle="Hesap bilgilerinizi güncelleyin.">
            <Field label="Ad" value={firstName} onChangeText={setFirstName} />
            <Field label="Soyad" value={lastName} onChangeText={setLastName} />
            <Field label="E-posta" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {saved ? <Text style={styles.saved}>Profil bilgileriniz güncellendi.</Text> : null}
            <PrimaryButton label="Kaydet" onPress={() => void submit()} busy={busy} />
          </Screen>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  error: { color: colors.error, fontFamily: 'PlusJakartaSans_600SemiBold', marginBottom: spacing.md },
  flex: { flex: 1 },
  safe: { backgroundColor: colors.background, flex: 1 },
  saved: { color: colors.accent, fontFamily: 'PlusJakartaSans_600SemiBold', marginBottom: spacing.md },
  scroll: { padding: spacing.xl, paddingBottom: 40 },
});
