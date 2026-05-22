import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createOrder, fetchAddresses, fetchStores, initCheckoutForm } from '@/api/client';
import { getWebBaseUrl } from '@/api/config';
import { Field, PrimaryButton, Screen } from '@/components/ui';
import { useCart } from '@/context/cart-context';
import type { Address, Order, Store } from '@/types';
import { formatTry } from '@/utils/format';
import { colors, radii, spacing } from '@/theme';

export default function CheckoutScreen(): React.JSX.Element {
  const router = useRouter();
  const { items, reload: reloadCart } = useCart();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [deliveryType, setDeliveryType] = useState<'HOME_DELIVERY' | 'PICKUP'>('HOME_DELIVERY');
  const [addressId, setAddressId] = useState<string | undefined>();
  const [pickupStoreId, setPickupStoreId] = useState<string | undefined>();
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [checkoutHtml, setCheckoutHtml] = useState<string | null>(null);
  const [pendingOrder, setPendingOrder] = useState<Order | null>(null);

  const subtotal = items.reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0);

  useEffect(() => {
    void Promise.all([fetchAddresses(), fetchStores()])
      .then(([a, s]) => {
        setAddresses(a);
        setStores(s);
        const def = a.find((x) => x.isDefault) ?? a[0];
        if (def) setAddressId(def.id);
        if (s[0]) setPickupStoreId(s[0].id);
      })
      .catch(() => setError('Adres veya mağaza bilgileri yüklenemedi.'));
  }, []);

  async function startPayment(): Promise<void> {
    if (!items.length) {
      setError('Sepetiniz boş.');
      return;
    }
    if (deliveryType === 'HOME_DELIVERY' && !addressId) {
      setError('Teslimat adresi seçin.');
      return;
    }
    if (deliveryType === 'PICKUP' && !pickupStoreId) {
      setError('Mağaza seçin.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const order = await createOrder({
        deliveryType,
        addressId: deliveryType === 'HOME_DELIVERY' ? addressId : undefined,
        pickupStoreId: deliveryType === 'PICKUP' ? pickupStoreId : undefined,
        note: note.trim() || undefined,
      });
      setPendingOrder(order);
      const { checkoutFormContent } = await initCheckoutForm(order.id);
      setCheckoutHtml(checkoutFormContent);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sipariş oluşturulamadı.');
    } finally {
      setBusy(false);
    }
  }

  function onWebViewNav(state: WebViewNavigation): void {
    const url = state.url ?? '';
    const webBase = getWebBaseUrl();
    if (!url.startsWith(webBase) && !url.includes('/odeme')) return;
    const parsed = new URL(url);
    const orderId = parsed.searchParams.get('orderId');
    const durum = parsed.searchParams.get('durum');
    if (orderId && durum) {
      setCheckoutHtml(null);
      void reloadCart();
      router.replace(`/orders/${orderId}${durum === 'basarili' ? '' : ''}`);
    }
  }

  const paymentHtml = checkoutHtml
    ? `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1" /></head><body>${checkoutHtml}</body></html>`
    : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable onPress={() => router.back()}><Text style={styles.back}>← Geri</Text></Pressable>
        <Screen title="Ödeme" subtitle={`Ara toplam: ${formatTry(subtotal)}`}>
          <View style={styles.toggleRow}>
            <Pressable style={[styles.toggle, deliveryType === 'HOME_DELIVERY' && styles.toggleActive]} onPress={() => setDeliveryType('HOME_DELIVERY')}>
              <Text style={styles.toggleText}>Teslimat</Text>
            </Pressable>
            <Pressable style={[styles.toggle, deliveryType === 'PICKUP' && styles.toggleActive]} onPress={() => setDeliveryType('PICKUP')}>
              <Text style={styles.toggleText}>Mağazadan al</Text>
            </Pressable>
          </View>
          {deliveryType === 'HOME_DELIVERY' ? (
            <>
              <Pressable style={styles.link} onPress={() => router.push('/addresses')}>
                <Text style={styles.linkText}>Adresleri yönet</Text>
              </Pressable>
              {addresses.map((a) => (
                <Pressable key={a.id} style={[styles.choice, addressId === a.id && styles.choiceActive]} onPress={() => setAddressId(a.id)}>
                  <Text style={styles.choiceTitle}>{a.title}</Text>
                  <Text style={styles.choiceMeta}>{a.district}, {a.city}</Text>
                </Pressable>
              ))}
            </>
          ) : (
            stores.map((s) => (
              <Pressable key={s.id} style={[styles.choice, pickupStoreId === s.id && styles.choiceActive]} onPress={() => setPickupStoreId(s.id)}>
                <Text style={styles.choiceTitle}>{s.name}</Text>
                <Text style={styles.choiceMeta}>{s.address}</Text>
              </Pressable>
            ))
          )}
          <Field label="Sipariş notu" value={note} onChangeText={setNote} multiline />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton label="Siparişi oluştur ve öde" onPress={() => void startPayment()} busy={busy} />
          {pendingOrder ? <Text style={styles.hint}>Sipariş: {pendingOrder.orderNumber}</Text> : null}
        </Screen>
      </ScrollView>
      <Modal visible={!!paymentHtml} animationType="slide" onRequestClose={() => setCheckoutHtml(null)}>
        <SafeAreaView style={{ flex: 1 }}>
          <Pressable style={styles.closePay} onPress={() => setCheckoutHtml(null)}>
            <Text style={styles.closePayText}>Kapat</Text>
          </Pressable>
          {paymentHtml ? (
            <WebView
              originWhitelist={['*']}
              source={{ html: paymentHtml }}
              onNavigationStateChange={onWebViewNav}
              style={{ flex: 1 }}
            />
          ) : null}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  back: { color: colors.accent, fontFamily: 'PlusJakartaSans_700Bold', marginBottom: spacing.md },
  choice: { backgroundColor: colors.surfaceLow, borderRadius: radii.lg, marginBottom: spacing.sm, padding: spacing.md },
  choiceActive: { borderColor: colors.accent, borderWidth: 2 },
  choiceMeta: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  choiceTitle: { fontFamily: 'PlusJakartaSans_700Bold' },
  closePay: { padding: spacing.lg },
  closePayText: { color: colors.error, fontFamily: 'PlusJakartaSans_700Bold' },
  error: { color: colors.error, marginBottom: spacing.md },
  hint: { color: colors.textMuted, marginTop: spacing.md, textAlign: 'center' },
  link: { marginBottom: spacing.md },
  linkText: { color: colors.accent, fontFamily: 'PlusJakartaSans_700Bold' },
  safe: { backgroundColor: colors.background, flex: 1 },
  scroll: { padding: spacing.xl, paddingBottom: 40 },
  toggle: { backgroundColor: colors.surfaceLow, borderRadius: radii.pill, flex: 1, paddingVertical: 12 },
  toggleActive: { backgroundColor: colors.chocolate },
  toggleRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  toggleText: { color: colors.text, fontFamily: 'PlusJakartaSans_700Bold', textAlign: 'center' },
});
