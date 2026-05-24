import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createAddress } from '@/api/client';
import { AddressMapPicker } from '@/components/address-map-picker';
import { Field, PrimaryButton, Screen } from '@/components/ui';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { addressSchema } from '@/schemas/forms';
import { colors, radii, spacing } from '@/theme';
import { hasValidMapPin, MAP_PIN_REQUIRED_TR } from '@/utils/address-form';

const DEFAULT_CITY = 'Mersin';

export default function NewAddressScreen(): React.JSX.Element {
  const router = useRouter();
  const { ready } = useRequireAuth();
  const [title, setTitle] = useState('');
  const [city, setCity] = useState(DEFAULT_CITY);
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
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pinOk = hasValidMapPin(latitude, longitude);

  async function submit(): Promise<void> {
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
      await createAddress({
        ...parsed.data,
        isDefault: false,
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
        mapAddress: mapAddress ?? undefined,
      });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Adres kaydedilemedi.');
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return <SafeAreaView style={styles.safe} edges={['top']} />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Geri</Text>
        </Pressable>
        <Screen title="Yeni adres">
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
