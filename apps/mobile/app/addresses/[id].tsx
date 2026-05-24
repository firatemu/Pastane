import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchAddresses, updateAddress } from '@/api/client';
import { AddressMapPicker } from '@/components/address-map-picker';
import { Field, PrimaryButton, Screen, SecondaryButton } from '@/components/ui';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { addressSchema } from '@/schemas/forms';
import { colors, radii, spacing } from '@/theme';
import { hasValidMapPin, MAP_PIN_REQUIRED_TR } from '@/utils/address-form';

export default function EditAddressScreen(): React.JSX.Element {
  const rawId = useLocalSearchParams<{ id?: string | string[] }>().id;
  const id = useMemo(
    () => (rawId === undefined ? undefined : Array.isArray(rawId) ? rawId[0] : rawId),
    [rawId],
  );
  const router = useRouter();
  const { ready } = useRequireAuth();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [title, setTitle] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [building, setBuilding] = useState('');
  const [floor, setFloor] = useState('');
  const [apartment, setApartment] = useState('');
  const [directions, setDirections] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [mapAddress, setMapAddress] = useState<string | null>(null);
  const [addressId, setAddressId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pinOk = hasValidMapPin(latitude, longitude);

  useEffect(() => {
    if (!ready) return;
    if (!id || id === '') {
      setLoading(false);
      setNotFound(true);
      return;
    }
    setLoading(true);
    void fetchAddresses()
      .then((list) => {
        const row = list.find((a) => a.id === id);
        if (!row) {
          setNotFound(true);
          return;
        }
        setAddressId(row.id);
        setTitle(row.title);
        setCity(row.city);
        setDistrict(row.district);
        setNeighborhood(row.neighborhood ?? '');
        setFullAddress(row.fullAddress);
        setBuilding(row.building ?? '');
        setFloor(row.floor ?? '');
        setApartment(row.apartment ?? '');
        setDirections(row.directions ?? '');
        setLatitude(row.latitude ?? null);
        setLongitude(row.longitude ?? null);
        setMapAddress(row.mapAddress ?? null);
        setNotFound(false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Adresler yüklenemedi.');
        setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [id, ready]);

  async function submit(): Promise<void> {
    if (!addressId) return;
    const parsed = addressSchema.safeParse({
      title,
      city,
      district,
      neighborhood,
      fullAddress,
      building,
      floor,
      apartment,
      directions,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Adres bilgileri eksik.');
      return;
    }
    if (!pinOk) {
      setError(MAP_PIN_REQUIRED_TR);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await updateAddress(addressId, {
        ...parsed.data,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        mapAddress: mapAddress ?? null,
      });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Güncellenemedi.');
    } finally {
      setBusy(false);
    }
  }

  if (!ready || loading) {
    return (
      <SafeAreaView style={[styles.safe, styles.centerLoading]} edges={['top']}>
        <ActivityIndicator color={colors.accent} size="large" />
      </SafeAreaView>
    );
  }

  if (notFound || !addressId) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.back}>← Geri</Text>
          </Pressable>
          <Screen title="Adres bulunamadı" subtitle="Bu adres silinmiş veya erişilemiyor olabilir.">
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <SecondaryButton label="Adreslerime dön" onPress={() => router.replace('/addresses')} />
          </Screen>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Geri</Text>
        </Pressable>
        <Screen title="Adresi düzenle">
          <Field label="Başlık" value={title} onChangeText={setTitle} placeholder="Ev, İş…" />
          <Field label="İl" value={city} onChangeText={setCity} />
          <Field label="İlçe" value={district} onChangeText={setDistrict} />
          <Field label="Mahalle" value={neighborhood} onChangeText={setNeighborhood} />
          <Field label="Açık adres" value={fullAddress} onChangeText={setFullAddress} multiline />
          <Field label="Bina / site" value={building} onChangeText={setBuilding} />
          <Field label="Kat" value={floor} onChangeText={setFloor} />
          <Field label="Daire" value={apartment} onChangeText={setApartment} />
          <Field label="Tarif" value={directions} onChangeText={setDirections} multiline />
          <View style={[styles.pinBadge, pinOk ? styles.pinBadgeOk : styles.pinBadgePending]}>
            <Text style={styles.pinBadgeText}>{pinOk ? 'Konum seçildi' : 'Konum bekliyor'}</Text>
          </View>
          <Text style={styles.mapTitle}>Harita doğrulaması</Text>
          <AddressMapPicker
            latitude={latitude}
            longitude={longitude}
            onCoordinatesChange={({ latitude: lat, longitude: lng, mapAddress: summary }) => {
              setLatitude(lat);
              setLongitude(lng);
              setMapAddress(summary);
            }}
          />
          {mapAddress ? <Text style={styles.mapSummary}>{mapAddress}</Text> : null}
          <PrimaryButton label="Kaydet" onPress={() => void submit()} busy={busy} />
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </Screen>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  back: { color: colors.accent, fontFamily: 'PlusJakartaSans_700Bold', marginBottom: spacing.md },
  centerLoading: { alignItems: 'center', justifyContent: 'center' },
  error: { color: colors.error, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: spacing.md },
  mapSummary: { color: colors.textMuted, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 11, marginBottom: spacing.md },
  mapTitle: { color: colors.primary, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, marginBottom: spacing.sm },
  pinBadge: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  pinBadgeOk: { backgroundColor: colors.surfaceHigh },
  pinBadgePending: { backgroundColor: colors.surfaceLow, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.accent },
  pinBadgeText: { color: colors.chocolate, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12 },
  safe: { backgroundColor: colors.background, flex: 1 },
  scroll: { padding: spacing.xl, paddingBottom: 40 },
});
