import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { deleteAddress, fetchAddresses, setDefaultAddress } from '@/api/client';
import { EmptyState, PrimaryButton, Screen } from '@/components/ui';
import type { Address } from '@/types';
import { colors, radii, shadow, spacing } from '@/theme';

export default function AddressesScreen(): React.JSX.Element {
  const router = useRouter();
  const [addresses, setAddresses] = useState<Address[]>([]);

  const load = useCallback(async () => {
    setAddresses(await fetchAddresses());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable onPress={() => router.back()}><Text style={styles.back}>← Geri</Text></Pressable>
        <Screen title="Adreslerim">
          <PrimaryButton label="Yeni adres" onPress={() => router.push('/addresses/new')} />
          {!addresses.length ? <EmptyState message="Kayıtlı adres yok." /> : null}
          {addresses.map((a) => (
            <View key={a.id} style={styles.card}>
              <Pressable onPress={() => router.push(`/addresses/${a.id}`)}>
                <Text style={styles.title}>{a.title}{a.isDefault ? ' · Varsayılan' : ''}</Text>
                <Text style={styles.meta}>{a.fullAddress}</Text>
                <Text style={styles.meta}>{a.district}, {a.city}</Text>
              </Pressable>
              {!a.isDefault ? (
                <Pressable onPress={() => void setDefaultAddress(a.id).then(load)}>
                  <Text style={styles.action}>Varsayılan yap</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={() => void deleteAddress(a.id).then(load)}>
                <Text style={styles.delete}>Sil</Text>
              </Pressable>
            </View>
          ))}
        </Screen>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  action: { color: colors.accent, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: spacing.sm },
  back: { color: colors.accent, fontFamily: 'PlusJakartaSans_700Bold', marginBottom: spacing.md },
  card: { ...shadow, backgroundColor: colors.surface, borderRadius: radii.xl, marginTop: spacing.md, padding: spacing.lg },
  delete: { color: colors.error, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: spacing.sm },
  meta: { color: colors.textMuted, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 13, marginTop: 4 },
  safe: { backgroundColor: colors.background, flex: 1 },
  scroll: { padding: spacing.xl, paddingBottom: 40 },
  title: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16 },
});
