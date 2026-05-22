import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createAddress } from '@/api/client';
import { Field, PrimaryButton, Screen } from '@/components/ui';
import { colors, spacing } from '@/theme';

export default function NewAddressScreen(): React.JSX.Element {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [directions, setDirections] = useState('');
  const [isDefault, setIsDefault] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await createAddress({ title, city, district, neighborhood: neighborhood || undefined, fullAddress, directions: directions || undefined, isDefault });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Adres kaydedilemedi.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Screen title="Yeni adres">
          <Field label="Başlık" value={title} onChangeText={setTitle} placeholder="Ev, İş…" />
          <Field label="İl" value={city} onChangeText={setCity} />
          <Field label="İlçe" value={district} onChangeText={setDistrict} />
          <Field label="Mahalle" value={neighborhood} onChangeText={setNeighborhood} />
          <Field label="Açık adres" value={fullAddress} onChangeText={setFullAddress} multiline />
          <Field label="Tarif" value={directions} onChangeText={setDirections} multiline />
          <PrimaryButton label={isDefault ? 'Varsayılan olarak kaydet' : 'Kaydet'} onPress={() => void submit()} busy={busy} />
          <PrimaryButton label={isDefault ? 'Varsayılan olmasın' : 'Varsayılan yap'} onPress={() => setIsDefault((v) => !v)} />
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </Screen>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  error: { color: colors.error, marginTop: spacing.md },
  safe: { backgroundColor: colors.background, flex: 1 },
  scroll: { padding: spacing.xl },
});
