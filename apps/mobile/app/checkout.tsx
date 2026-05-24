import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import type { ComponentProps } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View, type AppStateStatus } from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import {
  createOrder,
  fetchAddresses,
  fetchOrder,
  fetchPayments,
  fetchStores,
  initCheckoutForm,
  initiateCardPayment,
  validateCartForCheckout,
} from '@/api/client';
import { getWebBaseUrl } from '@/api/config';
import { LoadingOverlay } from '@/components/feedback/loading-overlay';
import { AppHeader } from '@/components/layout/app-header';
import { SafeScreen } from '@/components/layout/safe-screen';
import { Field, PrimaryButton, Screen, SecondaryButton } from '@/components/ui';
import { useCart } from '@/context/cart-context';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { checkoutSchema, mobileCardPaymentSchema } from '@/schemas/forms';
import type { Address, Order, Payment, Store } from '@/types';
import { formatTry } from '@/utils/format';
import { colors, radii, shadow, spacing } from '@/theme';

type ShouldStartLoadRequestArg = Parameters<
  NonNullable<ComponentProps<typeof WebView>['onShouldStartLoadWithRequest']>
>[0];

export default function CheckoutScreen(): React.JSX.Element {
  const router = useRouter();
  const { ready } = useRequireAuth();
  const { items, reload: reloadCart } = useCart();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [deliveryType, setDeliveryType] = useState<'HOME_DELIVERY' | 'PICKUP'>('HOME_DELIVERY');
  const [addressId, setAddressId] = useState<string | undefined>();
  const [pickupStoreId, setPickupStoreId] = useState<string | undefined>();
  const [note, setNote] = useState('');
  const [useScheduled, setUseScheduled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [checkoutHtml, setCheckoutHtml] = useState<string | null>(null);
  const [pendingOrder, setPendingOrder] = useState<Order | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'IYZICO' | 'CARD'>(__DEV__ ? 'CARD' : 'IYZICO');
  const [checking, setChecking] = useState(false);
  const [cardHolderName, setCardHolderName] = useState(__DEV__ ? 'Demo Müşteri' : '');
  const [cardNumber, setCardNumber] = useState(__DEV__ ? '5528790000000008' : '');
  const [expireMonth, setExpireMonth] = useState(__DEV__ ? '12' : '');
  const [expireYear, setExpireYear] = useState(__DEV__ ? '30' : '');
  const [cvc, setCvc] = useState(__DEV__ ? '123' : '');
  const [webViewLoading, setWebViewLoading] = useState(false);
  const pendingOrderIdRef = useRef<string | undefined>(undefined);

  const subtotal = items.reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0);

  useEffect(() => {
    if (!ready) return;
    setInitialLoading(true);
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
      })
      .finally(() => setInitialLoading(false));
  }, [ready, reloadCart]);

  useEffect(() => {
    pendingOrderIdRef.current = pendingOrder?.id;
  }, [pendingOrder?.id]);

  function buildScheduledAt(): string | undefined {
    if (!useScheduled) return undefined;
    if (!scheduleDate.trim() || !scheduleTime.trim()) {
      throw new Error('Planlı teslimat için tarih ve saat girin (YYYY-AA-GG ve SS:DD).');
    }
    const when = new Date(`${scheduleDate.trim()}T${scheduleTime.trim()}:00`);
    if (Number.isNaN(when.getTime())) {
      throw new Error('Geçersiz teslimat tarihi veya saati.');
    }
    if (when.getTime() <= Date.now()) {
      throw new Error('Planlı teslimat gelecekte bir zaman olmalı.');
    }
    return when.toISOString();
  }

  async function resolveOrder(): Promise<Order> {
    if (!items.length) {
      throw new Error('Sepetiniz boş.');
    }
    const scheduledAt = buildScheduledAt();
    const parsed = checkoutSchema.safeParse({
      deliveryType,
      addressId,
      pickupStoreId,
      note: note.trim() || undefined,
      scheduledAt,
    });
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? 'Sipariş bilgileri eksik.');
    }
    if (pendingOrder?.status === 'PAYMENT_PENDING') return pendingOrder;
    const order = await createOrder({
      deliveryType,
      addressId: deliveryType === 'HOME_DELIVERY' ? addressId : undefined,
      pickupStoreId: deliveryType === 'PICKUP' ? pickupStoreId : undefined,
      note: note.trim() || undefined,
      scheduledAt,
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
      if (paymentMethod === 'CARD') {
        const cardParsed = mobileCardPaymentSchema.safeParse({
          cardHolderName,
          cardNumber,
          expireMonth,
          expireYear,
          cvc,
        });
        if (!cardParsed.success) {
          throw new Error(cardParsed.error.issues[0]?.message ?? 'Kart bilgilerini kontrol edin.');
        }
        const payment = await initiateCardPayment(order.id, cardParsed.data, 'mobile-card');
        setPayments([payment]);
        const fresh = await fetchOrder(order.id).catch(() => order);
        setPendingOrder(fresh);
        await reloadCart();
        if (fresh.status === 'CONFIRMED' || payment.status === 'SUCCESS') {
          router.replace({ pathname: '/payment-result', params: { orderId: order.id, status: 'success' } } as never);
          return;
        }
        setError(
          __DEV__
            ? 'Ödeme beklemede. Geliştirmede PAYMENT_DEV_AUTO_SUCCESS=true ise ödeme simülasyonu tamamlanabilir.'
            : 'Ödeme henüz onaylanmadı; bir süre sonra "Ödemeyi kontrol et" ile tekrar deneyin.',
        );
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

  const checkPaymentStatus = useCallback(async (orderId = pendingOrder?.id): Promise<void> => {
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
  }, [pendingOrder?.id, reloadCart, router]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active' && checkoutHtml && pendingOrderIdRef.current) {
        void checkPaymentStatus(pendingOrderIdRef.current);
      }
    });
    return () => sub.remove();
  }, [checkoutHtml, checkPaymentStatus]);

  /** iOS için `onNavigationStateChange`; Android özel şema için `onShouldStartLoadWithRequest`. */
  function handlePaymentRedirectUrl(url: string): void {
    if (url.startsWith('pastahane://')) {
      const parsed = Linking.parse(url);
      const orderIdRaw = parsed.queryParams?.orderId;
      const statusRaw = parsed.queryParams?.status;
      const oid = typeof orderIdRaw === 'string' ? orderIdRaw : Array.isArray(orderIdRaw) ? orderIdRaw[0] : null;
      if (oid) {
        setCheckoutHtml(null);
        void checkPaymentStatus(oid);
        const st = typeof statusRaw === 'string' ? statusRaw : Array.isArray(statusRaw) ? statusRaw[0] : '';
        router.replace({ pathname: '/payment-result', params: { orderId: oid, status: st } } as never);
      }
      return;
    }

    const webBase = getWebBaseUrl();
    if (!url.startsWith(webBase) && !url.includes('/odeme')) return;
    try {
      const httpParsed = new URL(url);
      const orderIdParam = httpParsed.searchParams.get('orderId');
      const durum = httpParsed.searchParams.get('durum');
      if (orderIdParam && durum) {
        setCheckoutHtml(null);
        void checkPaymentStatus(orderIdParam);
      }
    } catch {
      /* geçersiz URL */
    }
  }

  function onWebViewNav(state: WebViewNavigation): void {
    handlePaymentRedirectUrl(state.url ?? '');
  }

  function onShouldStartLoadWithRequest(req: ShouldStartLoadRequestArg): boolean {
    const url = req.url ?? '';
    if (url.startsWith('pastahane://')) {
      handlePaymentRedirectUrl(url);
      return false;
    }
    return true;
  }

  const paymentHtml = checkoutHtml
    ? `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1" /></head><body>${checkoutHtml}</body></html>`
    : null;

  if (!ready || initialLoading) {
    return (
      <SafeScreen edges={['top']}>
        <LoadingOverlay message="Ödeme bilgileri yükleniyor…" visible />
      </SafeScreen>
    );
  }

  function closePaymentModal(): void {
    Alert.alert('Ödemeyi iptal et', 'Ödeme penceresini kapatmak istediğinize emin misiniz?', [
      { text: 'Devam et', style: 'cancel' },
      { text: 'Kapat', style: 'destructive', onPress: () => setCheckoutHtml(null) },
    ]);
  }

  return (
    <SafeScreen edges={['top']} padded={false}>
      <AppHeader title="ÖDEME" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.pad}>
        <Screen title="Ödeme" subtitle={`Ara toplam: ${formatTry(subtotal)}`}>
          {__DEV__ ? (
            <Text style={styles.devNote}>
              Geliştirme modunda kart ödemesi için API sürecinde PAYMENT_DEV_AUTO_SUCCESS=true kullanılabilir.
            </Text>
          ) : null}
          <View style={styles.toggleRow}>
            <Pressable style={[styles.toggle, deliveryType === 'HOME_DELIVERY' && styles.toggleActive]} onPress={() => setDeliveryType('HOME_DELIVERY')}>
              <Text style={[styles.toggleText, deliveryType === 'HOME_DELIVERY' && styles.toggleTextActive]}>Teslimat</Text>
            </Pressable>
            <Pressable style={[styles.toggle, deliveryType === 'PICKUP' && styles.toggleActive]} onPress={() => setDeliveryType('PICKUP')}>
              <Text style={[styles.toggleText, deliveryType === 'PICKUP' && styles.toggleTextActive]}>Mağazadan al</Text>
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
          <View style={styles.scheduleRow}>
            <Text style={styles.scheduleLabel}>Planlı teslimat</Text>
            <Switch value={useScheduled} onValueChange={setUseScheduled} trackColor={{ true: colors.accent }} />
          </View>
          {useScheduled ? (
            <>
              <Field label="Tarih (YYYY-AA-GG)" value={scheduleDate} onChangeText={setScheduleDate} placeholder="2026-05-24" />
              <Field label="Saat (SS:DD)" value={scheduleTime} onChangeText={setScheduleTime} placeholder="14:30" />
            </>
          ) : null}
          <Text style={styles.sectionTitle}>Ödeme yöntemi</Text>
          {__DEV__ ? (
            <Pressable style={[styles.choice, paymentMethod === 'CARD' && styles.choiceActive]} onPress={() => setPaymentMethod('CARD')}>
              <Text style={styles.choiceTitle}>Kart ile öde (dev)</Text>
              <Text style={styles.choiceMeta}>Yalnızca geliştirme ortamında.</Text>
            </Pressable>
          ) : null}
          <Pressable style={[styles.choice, paymentMethod === 'IYZICO' && styles.choiceActive]} onPress={() => setPaymentMethod('IYZICO')}>
            <Text style={styles.choiceTitle}>iyzico güvenli ödeme</Text>
            <Text style={styles.choiceMeta}>Ödeme formu backend tarafından başlatılır ve WebView içinde açılır.</Text>
          </Pressable>
          {__DEV__ && paymentMethod === 'CARD' ? (
            <>
              <Field label="Kart üzerindeki isim" value={cardHolderName} onChangeText={setCardHolderName} placeholder="Ad Soyad" autoCapitalize="words" />
              <Field label="Kart numarası" value={cardNumber} onChangeText={setCardNumber} placeholder="5528 7900 0000 0008" keyboardType="number-pad" />
              <Field label="Son kullanma ayı (AA)" value={expireMonth} onChangeText={setExpireMonth} placeholder="12" keyboardType="number-pad" maxLength={2} />
              <Field label="Son kullanma yılı (YY)" value={expireYear} onChangeText={setExpireYear} placeholder="30" keyboardType="number-pad" maxLength={2} />
              <Field label="CVC" value={cvc} onChangeText={setCvc} keyboardType="number-pad" maxLength={3} secureTextEntry />
            </>
          ) : null}
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
          {pendingOrder ? (
            <SecondaryButton
              label={checking ? 'Kontrol ediliyor' : 'Ödemeyi kontrol et'}
              onPress={() => void checkPaymentStatus()}
              busy={checking}
            />
          ) : null}
          {pendingOrder ? <Text style={styles.hint}>Sipariş: {pendingOrder.orderNumber}</Text> : null}
          {payments[0] ? <Text style={styles.hint}>Ödeme durumu: {payments[0].status}</Text> : null}
        </Screen>
        </View>
      </ScrollView>
      <Modal animationType="slide" onRequestClose={closePaymentModal} visible={!!paymentHtml}>
        <SafeScreen edges={['top']} padded={false}>
          <Pressable onPress={closePaymentModal} style={styles.closePay}>
            <Text style={styles.closePayText}>İptal</Text>
          </Pressable>
          {paymentHtml ? (
            <WebView
              onLoadEnd={() => setWebViewLoading(false)}
              onLoadStart={() => setWebViewLoading(true)}
              onNavigationStateChange={onWebViewNav}
              onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
              originWhitelist={['*']}
              source={{ html: paymentHtml }}
              style={{ flex: 1 }}
            />
          ) : null}
          <LoadingOverlay message="Güvenli ödeme yükleniyor…" visible={webViewLoading} />
        </SafeScreen>
      </Modal>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  choice: { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outlineVariant, borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth, marginBottom: spacing.sm, padding: spacing.md },
  choiceActive: { backgroundColor: colors.surfaceContainerLow, borderColor: colors.primary, borderWidth: 1 },
  choiceMeta: { color: colors.onSurfaceVariant, fontSize: 12, marginTop: 4 },
  choiceTitle: { fontFamily: 'PlusJakartaSans_700Bold' },
  closePay: { padding: spacing.lg },
  closePayText: { color: colors.error, fontFamily: 'PlusJakartaSans_700Bold' },
  devNote: { backgroundColor: colors.surfaceContainerLow, borderRadius: radii.lg, color: colors.secondary, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, lineHeight: 18, marginBottom: spacing.md, padding: spacing.md },
  error: { color: colors.error, marginBottom: spacing.md },
  hint: { color: colors.onSurfaceVariant, marginTop: spacing.md, textAlign: 'center' },
  link: { marginBottom: spacing.md },
  linkText: { color: colors.primary, fontFamily: 'PlusJakartaSans_700Bold' },
  pad: { paddingHorizontal: spacing.screenHorizontal },
  scheduleLabel: { color: colors.onSurfaceVariant, flex: 1, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13 },
  scheduleRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  scroll: { paddingBottom: 40, paddingTop: spacing.md },
  sectionTitle: { color: colors.primary, fontFamily: 'PlayfairDisplay_700Bold', fontSize: 22, marginBottom: spacing.md, marginTop: spacing.lg },
  summary: {
    backgroundColor: colors.surface,
    borderColor: colors.outline,
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.lg,
    ...shadow,
  },
  summaryLabel: { color: colors.textMuted, flex: 1, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 13 },
  summaryRow: { flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between', marginTop: spacing.sm },
  summaryTitle: {
    color: colors.chocolate,
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 11,
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  summaryTotal: { borderTopColor: colors.outline, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md, paddingTop: spacing.md },
  summaryTotalText: { color: colors.chocolate, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16 },
  summaryValue: { color: colors.chocolate, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13 },
  toggle: {
    backgroundColor: colors.surface,
    borderColor: colors.outline,
    borderRadius: radii.pill,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 11,
  },
  toggleActive: { backgroundColor: colors.surfaceLow, borderColor: colors.accent },
  toggleRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  toggleText: { color: colors.textMuted, fontFamily: 'PlusJakartaSans_600SemiBold', textAlign: 'center' },
  toggleTextActive: { color: colors.chocolate, fontFamily: 'PlusJakartaSans_700Bold' },
});
