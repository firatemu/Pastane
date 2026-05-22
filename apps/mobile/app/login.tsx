import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Field, PrimaryButton, SecondaryButton, Screen } from '@/components/ui';
import { useAuth } from '@/context/auth-context';
import { colors, spacing } from '@/theme';

export default function LoginScreen(): React.JSX.Element {
  const router = useRouter();
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await login(phone.replace(/\D/g, ''), password);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Giriş başarısız.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.pad}>
        <Screen title="Giriş yap" subtitle="Siparişlerinize ve sepetinize erişin.">
          <Field label="Telefon" keyboardType="phone-pad" value={phone} onChangeText={setPhone} placeholder="5XXXXXXXXX" />
          <Field label="Şifre" secureTextEntry value={password} onChangeText={setPassword} placeholder="••••••••" />
          {error ? <Field error={error} /> : null}
          <PrimaryButton label="Giriş yap" onPress={() => void submit()} busy={busy} />
          <SecondaryButton label="Kayıt ol" onPress={() => router.replace('/register')} />
        </Screen>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pad: { flex: 1, padding: spacing.xl },
  safe: { backgroundColor: colors.background, flex: 1 },
});
