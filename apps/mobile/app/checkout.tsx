import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  createOrder,
  fetchAddresses,
  fetchOrder,
  fetchPayments,
  fetchStores,
  initCheckoutForm,
  initiateDevCardPayment,
  validateCartForCheckout,
} from '@/api/client';
import { getWebBaseUrl } from '@/api/config';
import { Field, PrimaryButton, Screen } from '@/components/ui';
import { useCart } from '@/context/cart-context';
import type { Address, Order, Payment, Store } from '@/types';
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
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'IYZICO' | 'DEV_CARD'>(__DEV__ ? 'DEV_CARD' : 'IYZICO');
  const [checking, setChecking] = useState(false);

  const subtotal = items.reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0);

  useEffect(() => {
    void Promise.all([validateCartForCheckout(), fetchAddresses(), fetchStores()])
      .then(async ([, a, s]) => {
        await reloadCart();
        setAddresses(a);
        setStores(s);
        const def = a.find((x) => x.isDefault) ?? a[0];
        if (def) setAddressId(def.id);
        if (s[0]) setPickupStoreId(s[0].id);
      })
      .catch((e) => {
        void reloadCart();
        setError(e instanceof Error ? e.message : 'Sepet, adres veya mağaza bilgileri yüklenemedi.');
      });
  }, [reloadCart]);

  async function resolveOrder(): Promise<Order> {
    if (!items.length) {
      throw new Error('Sepetiniz boş.');
    }
    if (deliveryType === 'HOME_DELIVERY' && !addressId) {
      throw new Error('Teslimat adresi seçin.');
    }
    if (deliveryType === 'PICKUP' && !pickupStoreId) {
      throw new Error('Mağaza seçin.');
    }
    if (pendingOrder?.status === 'PAYMENT_PENDING') return pendingOrder;
    const order = await createOrder({
      deliveryType,
      addressId: deliveryType === 'HOME_DELIVERY' ? addressId : undefined,
      pickupStoreId: deliveryType === 'PICKUP' ? pickupStoreId : undefined,
      note: note.trim() || undefined,
    });
    setPendingOrder(order);
    return order;
  }

  async function startPayment(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await validateCartForCheckout();
      await reloadCart();
      const order = await resolveOrder();
      if (paymentMethod === 'DEV_CARD') {
        const payment = await initiateDevCardPayment(order.id);
        setPayments([payment]);
        const fresh = await fetchOrder(order.id).catch(() => order);
        setPendingOrder(fresh);
        await reloadCart();
        if (fresh.status === 'CONFIRMED' || payment.status === 'SUCCESS') {
          router.replace({ pathname: '/payment-result', params: { orderId: order.id, status: 'success' } } as never);
          return;
        }
        setError('Ödeme beklemede. Backend geliştirme simülasyonu için PAYMENT_DEV_AUTO_SUCCESS=true olmalı.');
        return;
      }
      const { checkoutFormContent } = await initCheckoutForm(order.id);
      setCheckoutHtml(checkoutFormContent);
    } catch (e) {
      await reloadCart();
      setError(e instanceof Error ? e.message : 'Ödeme başlatılamadı.');
    } finally {
      setBusy(false);
    }
  }

  async function checkPaymentStatus(orderId = pendingOrder?.id): Promise<void> {
    if (!orderId) return;
    setChecking(true);
    setError(null);
    try {
      const [order, nextPayments] = await Promise.all([fetchOrder(orderId), fetchPayments(orderId).catch(() => [])]);
      setPendingOrder(order);
      setPayments(nextPayments);
      await reloadCart();
      const latest = nextPayments[0];
      if (order.status === 'CONFIRMED' || latest?.status === 'SUCCESS') {
        setCheckoutHtml(null);
        router.replace({ pathname: '/payment-result', params: { orderId: order.id, status: 'success' } } as never);
      } else if (latest?.status === 'FAILED' || order.status === 'CANCELLED') {
        setError(latest?.failureReason ?? 'Ödeme başarısız oldu. Lütfen tekrar deneyin.');
      } else {
        setError('Ödeme sonucu henüz beklemede. Birkaç saniye sonra tekrar kontrol edin.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ödeme durumu kontrol edilemedi.');
    } finally {
      setChecking(false);
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
      void checkPaymentStatus(orderId);
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
          {__DEV__ ? <Text style={styles.devNote}>Geliştirme modunda test kartı backend tarafından başarılı ödeme simülasyonuyla tamamlanabilir.</Text> : null}
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
          <Text style={styles.sectionTitle}>Ödeme yöntemi</Text>
          {__DEV__ ? (
            <Pressable style={[styles.choice, paymentMethod === 'DEV_CARD' && styles.choiceActive]} onPress={() => setPaymentMethod('DEV_CARD')}>
              <Text style={styles.choiceTitle}>Test kartı ile ödeme</Text>
              <Text style={styles.choiceMeta}>Yalnızca geliştirme ortamı. Kart bilgisi mobilde toplanmaz.</Text>
            </Pressable>
          ) : null}
          <Pressable style={[styles.choice, paymentMethod === 'IYZICO' && styles.choiceActive]} onPress={() => setPaymentMethod('IYZICO')}>
            <Text style={styles.choiceTitle}>iyzico güvenli ödeme</Text>
            <Text style={styles.choiceMeta}>Ödeme formu backend tarafından başlatılır ve WebView içinde açılır.</Text>
          </Pressable>
          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>Sipariş özeti</Text>
            {items.map((item) => (
              <View key={item.id} style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{item.quantity} x {item.product.name}</Text>
                <Text style={styles.summaryValue}>{formatTry(Number(item.unitPrice) * item.quantity)}</Text>
              </View>
            ))}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Ara toplam</Text>
              <Text style={styles.summaryValue}>{formatTry(pendingOrder?.subtotal ?? subtotal)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Teslimat</Text>
              <Text style={styles.summaryValue}>{formatTry(pendingOrder?.deliveryFee ?? 0)}</Text>
            </View>
            {Number(pendingOrder?.loyaltyDiscount ?? 0) > 0 ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>İndirim</Text>
                <Text style={styles.summaryValue}>-{formatTry(pendingOrder?.loyaltyDiscount)}</Text>
              </View>
            ) : null}
            <View style={styles.summaryTotal}>
              <Text style={styles.summaryTotalText}>Genel toplam</Text>
              <Text style={styles.summaryTotalText}>{formatTry(pendingOrder?.grandTotal ?? subtotal)}</Text>
            </View>
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton label="Siparişi Oluştur ve Ödemeyi Başlat" onPress={() => void startPayment()} busy={busy} disabled={!items.length} />
          {pendingOrder ? <PrimaryButton label={checking ? 'Kontrol ediliyor' : 'Ödemeyi kontrol et'} onPress={() => void checkPaymentStatus()} busy={checking} /> : null}
          {pendingOrder ? <Text style={styles.hint}>Sipariş: {pendingOrder.orderNumber}</Text> : null}
          {payments[0] ? <Text style={styles.hint}>Ödeme durumu: {payments[0].status}</Text> : null}
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
  devNote: { backgroundColor: colors.surfaceLow, borderRadius: radii.lg, color: colors.secondary, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, lineHeight: 18, marginBottom: spacing.md, padding: spacing.md },
  error: { color: colors.error, marginBottom: spacing.md },
  hint: { color: colors.textMuted, marginTop: spacing.md, textAlign: 'center' },
  link: { marginBottom: spacing.md },
  linkText: { color: colors.accent, fontFamily: 'PlusJakartaSans_700Bold' },
  safe: { backgroundColor: colors.background, flex: 1 },
  scroll: { padding: spacing.xl, paddingBottom: 40 },
  sectionTitle: { color: colors.primary, fontFamily: 'PlayfairDisplay_700Bold', fontSize: 22, marginBottom: spacing.md, marginTop: spacing.lg },
  summary: { backgroundColor: colors.chocolate, borderRadius: radii.xl, marginBottom: spacing.lg, marginTop: spacing.md, padding: spacing.lg },
  summaryLabel: { color: 'rgba(255,248,245,0.76)', flex: 1, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 13 },
  summaryRow: { flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between', marginTop: spacing.sm },
  summaryTitle: { color: colors.gold, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, marginBottom: spacing.sm, textTransform: 'uppercase' },
  summaryTotal: { borderTopColor: 'rgba(255,255,255,0.18)', borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md, paddingTop: spacing.md },
  summaryTotalText: { color: colors.background, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16 },
  summaryValue: { color: colors.background, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13 },
  toggle: { backgroundColor: colors.surfaceLow, borderRadius: radii.pill, flex: 1, paddingVertical: 12 },
  toggleActive: { backgroundColor: colors.chocolate },
  toggleRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  toggleText: { color: colors.text, fontFamily: 'PlusJakartaSans_700Bold', textAlign: 'center' },
});
