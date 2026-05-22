import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchAddresses, updateAddress } from '@/api/client';
import { Field, PrimaryButton, Screen } from '@/components/ui';
import type { Address } from '@/types';
import { colors, spacing } from '@/theme';

export default function EditAddressScreen(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [address, setAddress] = useState<Address | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchAddresses().then((list) => setAddress(list.find((a) => a.id === id) ?? null));
  }, [id]);

  async function submit(): Promise<void> {
    if (!address) return;
    setBusy(true);
    try {
      await updateAddress(address.id, address);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Güncellenemedi.');
    } finally {
      setBusy(false);
    }
  }

  if (!address) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={{ margin: spacing.xl }}>Yükleniyor…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Screen title="Adresi düzenle">
          <Field label="Başlık" value={address.title} onChangeText={(v) => setAddress({ ...address, title: v })} />
          <Field label="İl" value={address.city} onChangeText={(v) => setAddress({ ...address, city: v })} />
          <Field label="İlçe" value={address.district} onChangeText={(v) => setAddress({ ...address, district: v })} />
          <Field label="Açık adres" value={address.fullAddress} onChangeText={(v) => setAddress({ ...address, fullAddress: v })} multiline />
          <PrimaryButton label="Kaydet" onPress={() => void submit()} busy={busy} />
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
