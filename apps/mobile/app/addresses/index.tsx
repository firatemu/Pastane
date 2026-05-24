import { mapUnknownErrorToTurkish } from '@pastane/tr-api-errors';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { deleteAddress, fetchAddresses, setDefaultAddress } from '@/api/client';
import { AppHeader } from '@/components/layout/app-header';
import { SafeScreen } from '@/components/layout/safe-screen';
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
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

  const load = useCallback(async (mode: 'full' | 'refresh' = 'full'): Promise<void> => {
    if (mode === 'full') setLoading(true);
    if (mode === 'refresh') setRefreshing(true);
    setError(null);
    try {
      setAddresses(await fetchAddresses());
    } catch (e) {
      setError(mapUnknownErrorToTurkish('customer', e, 'Adresler yüklenemedi.'));
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

  async function handleSetDefault(address: Address): Promise<void> {
    if (settingDefaultId) return;
    setSettingDefaultId(address.id);
    setError(null);
    try {
      await setDefaultAddress(address.id);
      setAddresses((prev) =>
        prev.map((a) => ({
          ...a,
          isDefault: a.id === address.id,
        })),
      );
      Alert.alert('Varsayılan adres', `"${address.title}" varsayılan adres olarak kaydedildi.`);
    } catch (e) {
      setError(mapUnknownErrorToTurkish('customer', e, 'Varsayılan adres yapılamadı.'));
    } finally {
      setSettingDefaultId(null);
    }
  }

  function confirmDelete(address: Address): void {
    Alert.alert('Adresi sil', `"${address.title}" adresini silmek istediğinize emin misiniz?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          void deleteAddress(address.id)
            .then(() => load('refresh'))
            .catch((e) => setError(mapUnknownErrorToTurkish('customer', e, 'Adres silinemedi.')));
        },
      },
    ]);
  }

  if (!ready) {
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
      <AppHeader showBack showMenu title="ADRESLERİM" onBackPress={() => router.back()} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load('refresh')} />}
      >
        <Screen title="Adreslerim" subtitle="Teslimat için kayıtlı adreslerinizi yönetin.">
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
                  disabled={settingDefaultId !== null}
                  onPress={() => void handleSetDefault(a)}
                  style={styles.defaultBtn}
                >
                  {settingDefaultId === a.id ? (
                    <ActivityIndicator color={colors.accent} size="small" />
                  ) : (
                    <Text style={styles.action}>Varsayılan yap</Text>
                  )}
                </Pressable>
              ) : null}
              <SecondaryButton label="Bu adresi sil" onPress={() => confirmDelete(a)} />
            </View>
          ))}
        </Screen>
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  action: { color: colors.accent, fontFamily: 'PlusJakartaSans_600SemiBold' },
  card: { ...shadow, backgroundColor: colors.surface, borderRadius: radii.xl, marginTop: spacing.md, padding: spacing.lg },
  center: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  defaultBtn: { marginTop: spacing.sm, minHeight: 28 },
  error: { color: colors.error, fontFamily: 'PlusJakartaSans_600SemiBold', marginBottom: spacing.md },
  loader: { marginVertical: spacing.lg },
  meta: { color: colors.textMuted, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 13, marginTop: 4 },
  scroll: { padding: spacing.xl, paddingBottom: 40 },
  title: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16 },
});
