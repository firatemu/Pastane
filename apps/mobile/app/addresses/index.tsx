import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { deleteAddress, fetchAddresses, setDefaultAddress } from '@/api/client';
import { EmptyState, PrimaryButton, Screen, SecondaryButton } from '@/components/ui';
import { useRequireAuth } from '@/hooks/use-require-auth';
import type { Address } from '@/types';
import { colors, radii, shadow, spacing } from '@/theme';

export default function AddressesScreen(): React.JSX.Element {
  const router = useRouter();
  const { ready } = useRequireAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (mode: 'full' | 'refresh' = 'full'): Promise<void> => {
    if (mode === 'full') setLoading(true);
    if (mode === 'refresh') setRefreshing(true);
    setError(null);
    try {
      setAddresses(await fetchAddresses());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Adresler yüklenemedi.');
      setAddresses([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (ready) void load('full');
    }, [load, ready]),
  );

  function confirmDelete(address: Address): void {
    Alert.alert('Adresi sil', `"${address.title}" adresini silmek istediğinize emin misiniz?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          void deleteAddress(address.id)
            .then(() => load('refresh'))
            .catch((e) => setError(e instanceof Error ? e.message : 'Adres silinemedi.'));
        },
      },
    ]);
  }

  if (!ready) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load('refresh')} />}
      >
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Geri</Text>
        </Pressable>
        <Screen title="Adreslerim">
          {loading ? <ActivityIndicator color={colors.accent} style={styles.loader} /> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton label="Yeni adres" onPress={() => router.push('/addresses/new')} />
          {!loading && !addresses.length ? <EmptyState message="Kayıtlı adres yok." /> : null}
          {addresses.map((a) => (
            <View key={a.id} style={styles.card}>
              <Pressable onPress={() => router.push(`/addresses/${a.id}`)}>
                <Text style={styles.title}>
                  {a.title}
                  {a.isDefault ? ' · Varsayılan' : ''}
                </Text>
                <Text style={styles.meta}>{a.fullAddress}</Text>
                <Text style={styles.meta}>
                  {a.neighborhood ? `${a.neighborhood}, ` : ''}
                  {a.district}, {a.city}
                </Text>
              </Pressable>
              {!a.isDefault ? (
                <Pressable
                  onPress={() =>
                    void setDefaultAddress(a.id)
                      .then(() => load('refresh'))
                      .catch((e) => setError(e instanceof Error ? e.message : 'Varsayılan yapılamadı.'))
                  }
                >
                  <Text style={styles.action}>Varsayılan yap</Text>
                </Pressable>
              ) : null}
              <SecondaryButton label="Bu adresi sil" onPress={() => confirmDelete(a)} />
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
  center: { alignItems: 'center', justifyContent: 'center' },
  error: { color: colors.error, fontFamily: 'PlusJakartaSans_600SemiBold', marginBottom: spacing.md },
  loader: { marginVertical: spacing.lg },
  meta: { color: colors.textMuted, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 13, marginTop: 4 },
  safe: { backgroundColor: colors.background, flex: 1 },
  scroll: { padding: spacing.xl, paddingBottom: 40 },
  title: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16 },
});
