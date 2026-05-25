import { mapUnknownErrorToTurkish } from '@pastane/tr-api-errors';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import type { ComponentProps } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, BackHandler, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View, type AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import {
  ApiRequestError,
  createOrder,
  fetchAddresses,
  fetchDeliveryZones,
  fetchOrder,
  fetchPayments,
  fetchStores,
  initCheckoutForm,
  reportCheckoutClientError,
  validateCartForCheckout,
} from '@/api/client';
import { getApiBaseUrl, getWebBaseUrl } from '@/api/config';
import { LoadingOverlay } from '@/components/feedback/loading-overlay';
import { AppHeader } from '@/components/layout/app-header';
import { SafeScreen } from '@/components/layout/safe-screen';
import { Field, PrimaryButton, Screen, SecondaryButton } from '@/components/ui';
import { useCart } from '@/context/cart-context';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { checkoutSchema } from '@/schemas/forms';
import type { Address, CartItem, Order, Payment, Store } from '@/types';
import { formatTry } from '@/utils/format';
import { colors, radii, shadow, spacing } from '@/theme';

type ShouldStartLoadRequestArg = Parameters<
  NonNullable<ComponentProps<typeof WebView>['onShouldStartLoadWithRequest']>
>[0];

const PAYMENT_PENDING_TIMEOUT_MS = 600_000;
const PENDING_PAYMENT_STORAGE_KEY = '@pastane/pending_payment_order';

type StoredPendingPayment = {
  orderId: string;
  startedAt: number;
};

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
  const [checking, setChecking] = useState(false);
  const [webViewLoading, setWebViewLoading] = useState(false);
  const [webViewCanGoBack, setWebViewCanGoBack] = useState(false);
  const [paymentStartedAt, setPaymentStartedAt] = useState<number | null>(null);
  const [deliverableDistricts, setDeliverableDistricts] = useState<Set<string>>(() => new Set());
  const pendingOrderIdRef = useRef<string | undefined>(undefined);
  const pendingOrderFormKeyRef = useRef<string | null>(null);
  const checkingRef = useRef(false);
  const webViewRef = useRef<WebView>(null);

  const clearPendingCheckout = useCallback(() => {
    setPendingOrder(null);
    setPayments([]);
    setPaymentStartedAt(null);
    pendingOrderFormKeyRef.current = null;
    void AsyncStorage.removeItem(PENDING_PAYMENT_STORAGE_KEY).catch(() => undefined);
  }, []);

  function checkoutFormKey(): string {
    return [
      deliveryType,
      deliveryType === 'HOME_DELIVERY' ? addressId ?? '' : '',
      deliveryType === 'PICKUP' ? pickupStoreId ?? '' : '',
      useScheduled ? `${scheduleDate}|${scheduleTime}` : '',
    ].join(':');
  }

  function isDistrictDeliverable(district: string): boolean {
    return deliverableDistricts.has(district.trim().toLocaleLowerCase('tr-TR'));
  }

  useEffect(() => {
    if (!ready) return;
    setInitialLoading(true);
    void Promise.all([
      validateCartForCheckout().catch(() => []),
      fetchAddresses(),
      fetchStores(),
      fetchDeliveryZones().catch(() => []),
      AsyncStorage.getItem(PENDING_PAYMENT_STORAGE_KEY).catch(() => null),
    ])
      .then(async ([, a, s, zones, storedPending]) => {
        await reloadCart();
        setAddresses(a);
        setStores(s);
        const zoneNames = new Set(zones.map((z) => z.name.trim().toLocaleLowerCase('tr-TR')));
        setDeliverableDistricts(zoneNames);
        const isDeliverable = (district: string) => zoneNames.has(district.trim().toLocaleLowerCase('tr-TR'));
        const def =
          a.find((x) => x.isDefault && isDeliverable(x.district)) ?? a.find((x) => isDeliverable(x.district)) ?? null;
        if (def) {
          setAddressId(def.id);
        } else if (a.length > 0) {
          setAddressId(undefined);
          setError('Teslimat için Yenişehir, Mezitli veya Akdeniz ilçeli bir adres seçin veya ekleyin.');
        }
        if (s[0]) setPickupStoreId(s[0].id);
        if (storedPending) {
          try {
            const parsed = JSON.parse(storedPending) as Partial<StoredPendingPayment>;
            if (typeof parsed.orderId === 'string' && typeof parsed.startedAt === 'number') {
              const order = await fetchOrder(parsed.orderId);
              if (order.status === 'PAYMENT_PENDING') {
                setDeliveryType(order.deliveryType);
                if (order.deliveryType === 'PICKUP' && order.pickupStoreId) {
                  setPickupStoreId(order.pickupStoreId);
                }
                let restoredAddressId = '';
                if (order.deliveryType === 'HOME_DELIVERY') {
                  const snap = order.addressSnapshot;
                  const matched =
                    a.find(
                      (addr) =>
                        snap?.district &&
                        addr.district.trim().toLocaleLowerCase('tr-TR') ===
                          snap.district.trim().toLocaleLowerCase('tr-TR') &&
                        (!snap.title || addr.title === snap.title),
                    ) ??
                    a.find((addr) => addr.isDefault) ??
                    a[0];
                  if (matched) {
                    restoredAddressId = matched.id;
                    setAddressId(matched.id);
                  }
                }
                setPendingOrder(order);
                pendingOrderFormKeyRef.current = [
                  order.deliveryType,
                  order.deliveryType === 'HOME_DELIVERY' ? (restoredAddressId ?? '') : '',
                  order.deliveryType === 'PICKUP' ? (order.pickupStoreId ?? '') : '',
                  '',
                ].join(':');
                setPaymentStartedAt(parsed.startedAt);
                setError('Bekleyen ödeme oturumu bulundu. Sonucu kontrol edebilirsiniz.');
              } else {
                await AsyncStorage.removeItem(PENDING_PAYMENT_STORAGE_KEY);
              }
            }
          } catch {
            await AsyncStorage.removeItem(PENDING_PAYMENT_STORAGE_KEY).catch(() => undefined);
          }
        }
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

  useEffect(() => {
    const orderId = pendingOrder?.id;
    if (!orderId) {
      setPayments([]);
      return;
    }
    void fetchPayments(orderId).then(setPayments).catch(() => setPayments([]));
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

  async function resolveOrder(cartItems: CartItem[]): Promise<Order> {
    if (!cartItems.length) {
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
    const formKey = checkoutFormKey();
    if (pendingOrder?.status === 'PAYMENT_PENDING' && pendingOrderFormKeyRef.current === formKey) {
      return pendingOrder;
    }
    const order = await createOrder({
      deliveryType,
      addressId: deliveryType === 'HOME_DELIVERY' ? addressId : undefined,
      pickupStoreId: deliveryType === 'PICKUP' ? pickupStoreId : undefined,
      note: note.trim() || undefined,
      scheduledAt,
    });
    pendingOrderFormKeyRef.current = formKey;
    setPendingOrder(order);
    return order;
  }

  async function startPayment(): Promise<void> {
    setBusy(true);
    setError(null);
    if (deliveryType === 'HOME_DELIVERY') {
      const selected = addresses.find((a) => a.id === addressId);
      if (!selected || !isDistrictDeliverable(selected.district)) {
        setBusy(false);
        setError('Seçtiğiniz adres için teslimat yapılmıyor. İlçeyi Yenişehir, Mezitli veya Akdeniz olarak güncelleyin.');
        return;
      }
    }
    // #region agent log
    fetch('http://127.0.0.1:7317/ingest/2fb3864b-34dc-4d52-b337-e3a2b59567ad', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'af6185' },
      body: JSON.stringify({
        sessionId: 'af6185',
        location: 'checkout.tsx:startPayment',
        message: 'payment start',
        data: {
          deliveryType,
          addressId: addressId ?? null,
          pickupStoreId: pickupStoreId ?? null,
          cartItems: items.length,
          pendingOrderId: pendingOrder?.id ?? null,
          formKey: checkoutFormKey(),
          pendingFormKey: pendingOrderFormKeyRef.current,
        },
        timestamp: Date.now(),
        hypothesisId: 'H2',
      }),
    }).catch(() => undefined);
    // #endregion
    try {
      const cartItems = await validateCartForCheckout();
      await reloadCart();
      const order = await resolveOrder(cartItems);
      // #region agent log
      fetch('http://127.0.0.1:7317/ingest/2fb3864b-34dc-4d52-b337-e3a2b59567ad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'af6185' },
        body: JSON.stringify({
          sessionId: 'af6185',
          location: 'checkout.tsx:startPayment',
          message: 'order resolved, init checkout',
          data: { orderId: order.id, orderNumber: order.orderNumber, grandTotal: order.grandTotal },
          timestamp: Date.now(),
          hypothesisId: 'H2',
        }),
      }).catch(() => undefined);
      // #endregion
      const { checkoutFormContent } = await initCheckoutForm(order.id);
      const startedAt = Date.now();
      setPaymentStartedAt(startedAt);
      await AsyncStorage.setItem(PENDING_PAYMENT_STORAGE_KEY, JSON.stringify({ orderId: order.id, startedAt } satisfies StoredPendingPayment));
      setCheckoutHtml(checkoutFormContent);
      // #region agent log
      fetch('http://127.0.0.1:7317/ingest/2fb3864b-34dc-4d52-b337-e3a2b59567ad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'af6185' },
        body: JSON.stringify({
          sessionId: 'af6185',
          location: 'checkout.tsx:startPayment',
          message: 'checkout form ready',
          data: { orderId: order.id, htmlLength: checkoutFormContent.length },
          timestamp: Date.now(),
          hypothesisId: 'H4',
        }),
      }).catch(() => undefined);
      // #endregion
    } catch (e) {
      await reloadCart();
      const errMsg = e instanceof Error ? e.message : String(e);
      const errCode = e instanceof ApiRequestError ? e.code : undefined;
      void reportCheckoutClientError({
        step: 'startPayment',
        message: errMsg,
        code: errCode,
        orderId: pendingOrder?.id,
      });
      // #region agent log
      fetch('http://127.0.0.1:7317/ingest/2fb3864b-34dc-4d52-b337-e3a2b59567ad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'af6185' },
        body: JSON.stringify({
          sessionId: 'af6185',
          location: 'checkout.tsx:startPayment',
          message: 'payment start failed',
          data: { errMsg: errMsg.slice(0, 200) },
          timestamp: Date.now(),
          hypothesisId: 'H4',
        }),
      }).catch(() => undefined);
      // #endregion
      const mapped = e instanceof ApiRequestError ? e.message : mapUnknownErrorToTurkish('customer', e, 'Ödeme başlatılamadı.');
      const showCode = process.env.EXPO_PUBLIC_CHECKOUT_DEBUG === '1';
      setError(showCode && errCode ? `${mapped} (${errCode})` : mapped);
    } finally {
      setBusy(false);
    }
  }

  const checkPaymentStatus = useCallback(async (orderId = pendingOrder?.id): Promise<void> => {
    if (!orderId) return;
    if (checkingRef.current) return;
    checkingRef.current = true;
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
        setPaymentStartedAt(null);
        await AsyncStorage.removeItem(PENDING_PAYMENT_STORAGE_KEY).catch(() => undefined);
        router.replace({ pathname: '/payment-result', params: { orderId: order.id, status: 'success' } } as never);
      } else if (latest?.status === 'FAILED' || order.status === 'CANCELLED') {
        setCheckoutHtml(null);
        setPaymentStartedAt(null);
        await AsyncStorage.removeItem(PENDING_PAYMENT_STORAGE_KEY).catch(() => undefined);
        setError(latest?.failureReason ?? 'Ödeme başarısız oldu. Lütfen tekrar deneyin.');
        router.replace({ pathname: '/payment-result', params: { orderId: order.id, status: 'failure' } } as never);
      } else {
        setError('Ödeme sonucu henüz beklemede. Birkaç saniye sonra tekrar kontrol edin.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ödeme durumu kontrol edilemedi.');
    } finally {
      checkingRef.current = false;
      setChecking(false);
    }
  }, [pendingOrder?.id, reloadCart, router]);

  useEffect(() => {
    if (!checkoutHtml || !pendingOrder?.id || paymentStartedAt === null) return undefined;
    let cancelled = false;
    const startedAt = paymentStartedAt;
    const tick = async (): Promise<void> => {
      if (cancelled) return;
      if (Date.now() - startedAt >= PAYMENT_PENDING_TIMEOUT_MS) {
        setCheckoutHtml(null);
        setPaymentStartedAt(null);
        await AsyncStorage.removeItem(PENDING_PAYMENT_STORAGE_KEY).catch(() => undefined);
        setError('Ödeme sonucu bekleniyor. Banka onayı tamamlandıysa birkaç dakika içinde sipariş detayından tekrar kontrol edebilirsiniz.');
        return;
      }
      await checkPaymentStatus(pendingOrder.id);
    };
    const interval = setInterval(() => void tick(), 10_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [checkoutHtml, checkPaymentStatus, paymentStartedAt, pendingOrder?.id]);

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
      const oid = typeof orderIdRaw === 'string' ? orderIdRaw : Array.isArray(orderIdRaw) ? orderIdRaw[0] : null;
      if (oid) {
        setCheckoutHtml(null);
        void checkPaymentStatus(oid);
      }
      return;
    }

    const webBase = getWebBaseUrl();
    if (!url.startsWith('https://') && !url.startsWith(webBase)) return;
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
    setWebViewCanGoBack(state.canGoBack);
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

  const closePaymentModal = useCallback((): void => {
    Alert.alert('Ödemeyi iptal et', 'Ödeme penceresini kapatmak istediğinize emin misiniz?', [
      { text: 'Devam et', style: 'cancel' },
      { text: 'Kapat', style: 'destructive', onPress: () => setCheckoutHtml(null) },
    ]);
  }, []);

  useEffect(() => {
    if (!checkoutHtml) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (webViewCanGoBack) {
        webViewRef.current?.goBack();
        return true;
      }
      closePaymentModal();
      return true;
    });
    return () => sub.remove();
  }, [checkoutHtml, closePaymentModal, webViewCanGoBack]);

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

  const payment = payments[0];
  const checkoutComplete = pendingOrder?.status === 'CONFIRMED' || payment?.status === 'SUCCESS';
  const selectedAddress = addresses.find((a) => a.id === addressId);
  const homeDeliveryBlocked =
    deliveryType === 'HOME_DELIVERY' &&
    (!addressId || !selectedAddress || !isDistrictDeliverable(selectedAddress.district));
  const payLocked = busy || checkoutComplete;
  const payLabel = busy ? 'Yükleniyor…' : checkoutComplete ? 'Ödeme tamamlandı' : 'İyzico ile öde';
  const showPaymentCheck = Boolean(pendingOrder) && !checkoutComplete;

  return (
    <SafeScreen edges={['top']} padded={false}>
      <AppHeader showBack showSearch={false} title="ÖDEME" onBackPress={() => router.back()} />
      <View style={styles.scrollHost}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
      >
        <View style={styles.pad}>
        <Screen
          title="Ödeme ve teslimat"
          subtitle="Teslimat seçimini tamamlayın; ödemeyi iyzico güvenli ödeme formu ile yapın."
        >
          <View style={styles.toggleRow}>
            <Pressable
              style={[styles.toggle, deliveryType === 'HOME_DELIVERY' && styles.toggleActive]}
              onPress={() => {
                clearPendingCheckout();
                setDeliveryType('HOME_DELIVERY');
              }}
            >
              <Text style={[styles.toggleText, deliveryType === 'HOME_DELIVERY' && styles.toggleTextActive]}>Teslimat</Text>
            </Pressable>
            <Pressable
              style={[styles.toggle, deliveryType === 'PICKUP' && styles.toggleActive]}
              onPress={() => {
                clearPendingCheckout();
                setDeliveryType('PICKUP');
              }}
            >
              <Text style={[styles.toggleText, deliveryType === 'PICKUP' && styles.toggleTextActive]}>Mağazadan al</Text>
            </Pressable>
          </View>
          {deliveryType === 'HOME_DELIVERY' ? (
            <>
              <Pressable style={styles.link} onPress={() => router.push('/addresses')}>
                <Text style={styles.linkText}>Adresleri yönet</Text>
              </Pressable>
              {addresses.map((a) => {
                const deliverable = isDistrictDeliverable(a.district);
                return (
                  <Pressable
                    key={a.id}
                    style={[
                      styles.choice,
                      addressId === a.id && styles.choiceActive,
                      !deliverable && styles.choiceDisabled,
                    ]}
                    onPress={() => {
                      clearPendingCheckout();
                      setAddressId(a.id);
                      if (!deliverable) {
                        setError('Bu adres teslimat bölgesinde değil. İlçeyi Yenişehir, Mezitli veya Akdeniz yapın.');
                      } else {
                        setError(null);
                      }
                    }}
                  >
                    <Text style={styles.choiceTitle}>{a.title}</Text>
                    <Text style={styles.choiceMeta}>{a.district}, {a.city}</Text>
                    {!deliverable ? (
                      <Text style={styles.choiceWarn}>Teslimat bölgesi dışı (Yenişehir, Mezitli, Akdeniz)</Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </>
          ) : (
            stores.map((s) => (
              <Pressable
                key={s.id}
                style={[styles.choice, pickupStoreId === s.id && styles.choiceActive]}
                onPress={() => {
                  clearPendingCheckout();
                  setPickupStoreId(s.id);
                }}
              >
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
          <Pressable style={[styles.choice, styles.choiceActive]}>
            <Text style={styles.choiceTitle}>iyzico güvenli ödeme</Text>
            <Text style={styles.choiceMeta}>
              Kart bilgileriniz iyzico güvenli ödeme altyapısında işlenir; ödeme formu uygulama içinde açılır.
            </Text>
          </Pressable>
          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>Sipariş özeti</Text>
            {items.map((item) => (
              <View key={item.id} style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  {item.quantity} x {item.product.name}
                </Text>
                <Text style={styles.summaryValue}>
                  {formatTry((Number(item.unitPrice) * item.quantity).toFixed(2))}
                </Text>
              </View>
            ))}
            {pendingOrder ? (
              <>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Ara toplam</Text>
                  <Text style={styles.summaryValue}>{formatTry(pendingOrder.subtotal)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Teslimat</Text>
                  <Text style={styles.summaryValue}>{formatTry(pendingOrder.deliveryFee)}</Text>
                </View>
                {pendingOrder.serviceFee && Number(pendingOrder.serviceFee) > 0 ? (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Servis</Text>
                    <Text style={styles.summaryValue}>{formatTry(pendingOrder.serviceFee)}</Text>
                  </View>
                ) : null}
                {Number(pendingOrder.loyaltyDiscount ?? 0) > 0 ? (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>
                      Puan indirimi
                      {pendingOrder.loyaltyPointsUsed ? ` (${pendingOrder.loyaltyPointsUsed} puan)` : ''}
                    </Text>
                    <Text style={styles.summaryValue}>-{formatTry(pendingOrder.loyaltyDiscount)}</Text>
                  </View>
                ) : null}
                <View style={styles.summaryTotal}>
                  <Text style={styles.summaryTotalText}>Genel toplam</Text>
                  <Text style={styles.summaryTotalText}>{formatTry(pendingOrder.grandTotal)}</Text>
                </View>
              </>
            ) : (
              <Text style={styles.summaryHint}>Tutar, sipariş oluşturulurken sunucudan alınır.</Text>
            )}
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton
            busy={busy}
            disabled={!items.length || payLocked || homeDeliveryBlocked}
            label={payLabel}
            onPress={() => void startPayment()}
          />
          {showPaymentCheck ? (
            <SecondaryButton
              label={checking ? 'Kontrol ediliyor' : 'Ödemeyi kontrol et'}
              onPress={() => void checkPaymentStatus()}
              busy={checking}
            />
          ) : null}
          {pendingOrder ? <Text style={styles.hint}>Sipariş: {pendingOrder.orderNumber}</Text> : null}
          {payments[0] ? <Text style={styles.hint}>Ödeme durumu: {payments[0].status}</Text> : null}
          {process.env.EXPO_PUBLIC_CHECKOUT_DEBUG === '1' ? (
            <Text style={styles.hint}>API: {getApiBaseUrl()}</Text>
          ) : null}
        </Screen>
        </View>
      </ScrollView>
      </View>
      <Modal animationType="slide" onRequestClose={closePaymentModal} visible={!!paymentHtml}>
        <SafeScreen edges={['top']} padded={false}>
          <Pressable onPress={closePaymentModal} style={styles.closePay}>
            <Text style={styles.closePayText}>İptal</Text>
          </Pressable>
          {paymentHtml ? (
            <WebView
              ref={webViewRef}
              onLoadEnd={() => setWebViewLoading(false)}
              onLoadStart={() => setWebViewLoading(true)}
              onNavigationStateChange={onWebViewNav}
              onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
              originWhitelist={['*']}
              mixedContentMode="never"
              setSupportMultipleWindows={false}
              source={{ html: paymentHtml, baseUrl: getWebBaseUrl() }}
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
  choiceDisabled: { opacity: 0.72 },
  choiceWarn: { color: colors.error, fontSize: 11, marginTop: 4 },
  choiceMeta: { color: colors.onSurfaceVariant, fontSize: 12, marginTop: 4 },
  choiceTitle: { fontFamily: 'PlusJakartaSans_700Bold' },
  closePay: { padding: spacing.lg },
  closePayText: { color: colors.error, fontFamily: 'PlusJakartaSans_700Bold' },
  error: { color: colors.error, marginBottom: spacing.md },
  hint: { color: colors.onSurfaceVariant, marginTop: spacing.md, textAlign: 'center' },
  link: { marginBottom: spacing.md },
  linkText: { color: colors.primary, fontFamily: 'PlusJakartaSans_700Bold' },
  pad: { paddingHorizontal: spacing.screenHorizontal },
  scheduleLabel: { color: colors.onSurfaceVariant, flex: 1, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13 },
  scheduleRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  scrollHost: { flex: 1 },
  scrollView: { flex: 1 },
  scroll: { flexGrow: 1, paddingBottom: spacing.section, paddingTop: spacing.md },
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
  summaryHint: { color: colors.onSurfaceVariant, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 13, lineHeight: 20, marginTop: spacing.sm },
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
  toggleActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  toggleRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  toggleText: { color: colors.textMuted, fontFamily: 'PlusJakartaSans_600SemiBold', textAlign: 'center' },
  toggleTextActive: { color: colors.onPrimary, fontFamily: 'PlusJakartaSans_700Bold' },
});
