import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Field, PrimaryButton, Screen } from '@/components/ui';
import { useAuth } from '@/context/auth-context';
import { colors, spacing } from '@/theme';

export default function RegisterScreen(): React.JSX.Element {
  const router = useRouter();
  const { register } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.replace(/\D/g, ''),
        email: email.trim() || undefined,
        password,
      });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kayıt başarısız.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.pad}>
        <Screen title="Kayıt ol" subtitle="Pastane müşteri hesabı oluşturun.">
          <Field label="Ad" value={firstName} onChangeText={setFirstName} />
          <Field label="Soyad" value={lastName} onChangeText={setLastName} />
          <Field label="Telefon" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
          <Field label="E-posta (isteğe bağlı)" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
          <Field label="Şifre" secureTextEntry value={password} onChangeText={setPassword} />
          {error ? <Field error={error} /> : null}
          <PrimaryButton label="Kayıt ol" onPress={() => void submit()} busy={busy} />
        </Screen>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pad: { flex: 1, padding: spacing.xl },
  safe: { backgroundColor: colors.background, flex: 1 },
});
