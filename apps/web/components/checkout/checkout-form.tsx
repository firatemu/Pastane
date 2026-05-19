'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { checkoutDeliveryOnlySchema, checkoutSchema, type CheckoutValues } from '../../lib/checkout/schemas';
import type { Address, Order, Payment, Store } from '../../lib/checkout/types';
import type { Cart } from '../../lib/cart/types';
import { customerFacingMessageFromUnknownError, messageFromCustomerApiPayload, type ParsedCustomerApiPayload } from '../../lib/messages/customer-facing-errors';
import { paymentStatusLabel } from '../../lib/orders/status';
import { formatTry } from '../shared/price';

function latestPayment(payments: Payment[]): Payment | null { return payments[0] ?? null; }
const devPaymentDefaults = process.env.NODE_ENV === 'production' ? { cardHolderName: '', cardNumber: '', expireMonth: '', expireYear: '', cvc: '' } : { cardHolderName: 'Demo Müşteri', cardNumber: '5528790000000008', expireMonth: '12', expireYear: '30', cvc: '123' };

export function CheckoutForm(): React.JSX.Element {
  const [addresses, setAddresses] = useState<Address[]>([]); const [stores, setStores] = useState<Store[]>([]); const [cart, setCart] = useState<Cart | null>(null); const [order, setOrder] = useState<Order | null>(null); const [payments, setPayments] = useState<Payment[]>([]); const [busy, setBusy] = useState(false); const [iyBusy, setIyBusy] = useState(false); const [error, setError] = useState<string | null>(null); const [iyCheckoutHtml, setIyCheckoutHtml] = useState<string | null>(null);
  const iyRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const payment = latestPayment(payments);
  const { register, handleSubmit, watch, getValues, formState: { errors } } = useForm<CheckoutValues>({ resolver: zodResolver(checkoutSchema), defaultValues: { deliveryType: 'HOME_DELIVERY', ...devPaymentDefaults } });
  const regCard = register('cardNumber');
  const regMonth = register('expireMonth');
  const regYear = register('expireYear');
  const regCvc = register('cvc');
  const deliveryType = watch('deliveryType');
  useEffect(() => { void Promise.all([fetch('/api/addresses').then(r => r.json()), fetch('/api/stores').then(r => r.json()), fetch('/api/cart').then(r => r.json())]).then(([a, s, c]) => {
    const storePayload = s.data as Store[] | { items?: Store[] } | undefined;
    const storeList = Array.isArray(storePayload) ? storePayload : (storePayload?.items ?? []);
    setAddresses(a.data ?? []); setStores(storeList); setCart(c.data ?? { id: '', items: [] });
  }).catch(() => setError('Ödeme bilgileri yüklenemedi. Lütfen sayfayı yenileyin.')); }, []);
  useEffect(() => {
    const orderId = searchParams.get('orderId');
    const status = searchParams.get('durum');
    if (status === 'basarisiz') {
      setError((prev) => {
        if (prev) return prev;
        return orderId
          ? 'Ödeme tamamlanamadı. Aşağıdaki hata ayrıntısına bakın veya ödemeyi yeniden deneyin. Sorun sürerse yeni sipariş için ana sayfadan sepeti yenileyin.'
          : 'Ödeme başlatılamadı. Oturum veya ağ hatası olabilir; API sunucusunun çalıştığından emin olun. Geliştirmede kök `.env` içine PAYMENT_DEV_AUTO_SUCCESS=true yazıp API sürecini yeniden başlatın (Nest `apps/api` çalışıyorsa bu değişken sürece girmiş olmalıdır).';
      });
    }
    if (status === 'basarili') setError(null);
    if (!orderId) return;
    void Promise.all([fetch(`/api/orders/${orderId}`, { cache: 'no-store' }).then(r => r.json()), fetch(`/api/payments/${orderId}`, { cache: 'no-store' }).then(r => r.json())]).then(([o, p]) => {
      setOrder(o.data ?? null);
      setPayments(Array.isArray(p.data) ? p.data : p.data ? [p.data] : []);
    }).catch(() => setError('Sipariş veya ödeme bilgisi alınamadı. Lütfen tekrar deneyin.'));
  }, [searchParams]);

  async function resolveOrderToPay(fields: Pick<CheckoutValues, 'deliveryType' | 'addressId' | 'pickupStoreId' | 'note'>, pendingOrder: Order | null): Promise<Order> {
    if (pendingOrder?.status === 'PAYMENT_PENDING') return pendingOrder;
    const orderResponse = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deliveryType: fields.deliveryType,
        addressId: fields.addressId,
        pickupStoreId: fields.pickupStoreId,
        note: fields.note,
      }),
    });
    const orderPayload = (await orderResponse.json()) as ParsedCustomerApiPayload & { data?: Order };
    if (!orderResponse.ok || !orderPayload.data) {
      throw new Error(messageFromCustomerApiPayload(orderResponse.status, orderPayload, 'Sipariş oluşturulamadı.'));
    }
    setOrder(orderPayload.data);
    return orderPayload.data;
  }

  async function payWithIyzico(): Promise<void> {
    const parsed = checkoutDeliveryOnlySchema.safeParse(getValues());
    if (!parsed.success) {
      const fe = parsed.error.flatten();
      const msg =
        fe.fieldErrors.addressId?.[0] ?? fe.fieldErrors.pickupStoreId?.[0] ?? fe.fieldErrors.deliveryType?.[0] ?? 'Teslimat seçimlerini kontrol edin.';
      setError(msg);
      return;
    }
    setIyBusy(true); setError(null); setIyCheckoutHtml(null);
    try {
      const orderToPay = await resolveOrderToPay(parsed.data, order);
      const paymentResponse = await fetch('/api/payments/checkout-form-init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'idempotency-key': `${orderToPay.id}:iyzico-web` },
        body: JSON.stringify({ orderId: orderToPay.id }),
      });
      const paymentPayload = (await paymentResponse.json()) as ParsedCustomerApiPayload & { data?: { checkoutFormContent?: string } };
      if (!paymentResponse.ok || typeof paymentPayload.data?.checkoutFormContent !== 'string') {
        throw new Error(messageFromCustomerApiPayload(paymentResponse.status, paymentPayload, 'iyzico ödeme formu başlatılamadı.'));
      }
      setIyCheckoutHtml(paymentPayload.data.checkoutFormContent);
      void Promise.all([fetch(`/api/orders/${orderToPay.id}`, { cache: 'no-store' }).then(r => r.json()), fetch(`/api/payments/${orderToPay.id}`, { cache: 'no-store' }).then(r => r.json())]).then(([o, p]) => {
        setOrder(o.data ?? orderToPay);
        setPayments(Array.isArray(p.data) ? p.data : p.data ? [p.data] : []);
      }).catch(() => { /* özet isteğe bağlı */ });
      requestAnimationFrame(() => iyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
    } catch (e) {
      setError(customerFacingMessageFromUnknownError(e, 'iyzico ödemesi başlatılamadı.'));
    } finally {
      setIyBusy(false);
    }
  }

  useEffect(() => {
    const el = iyRef.current;
    if (!iyCheckoutHtml || !el) return;
    el.innerHTML = iyCheckoutHtml;
    el.querySelectorAll('script').forEach((oldScript) => {
      const newScript = document.createElement('script');
      for (const attr of oldScript.attributes) {
        newScript.setAttribute(attr.name, attr.value);
      }
      newScript.textContent = oldScript.textContent;
      oldScript.parentNode?.replaceChild(newScript, oldScript);
    });
  }, [iyCheckoutHtml]);
  async function submit(values: CheckoutValues) {
    setBusy(true); setError(null);
    let orderIdForRecovery: string | null = null;
    try {
      const orderToPay = await resolveOrderToPay(values, order);

      orderIdForRecovery = orderToPay.id;

      const paymentResponse = await fetch('/api/payments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'idempotency-key': `${orderToPay.id}:web` },
        body: JSON.stringify({
          orderId: orderToPay.id,
          cardHolderName: values.cardHolderName,
          cardNumber: values.cardNumber,
          expireMonth: values.expireMonth,
          expireYear: values.expireYear,
          cvc: values.cvc,
        }),
      });
      const paymentPayload = (await paymentResponse.json()) as ParsedCustomerApiPayload & { data?: Payment };
      if (!paymentResponse.ok || !paymentPayload.data) {
        throw new Error(messageFromCustomerApiPayload(paymentResponse.status, paymentPayload, 'Ödeme başlatılamadı.'));
      }
      const [freshOrderResponse, freshPaymentResponse] = await Promise.all([
        fetch(`/api/orders/${orderToPay.id}`, { cache: 'no-store' }),
        fetch(`/api/payments/${orderToPay.id}`, { cache: 'no-store' }),
      ]);
      const [freshOrderPayload, freshPaymentPayload] = await Promise.all([
        freshOrderResponse.json() as Promise<ParsedCustomerApiPayload & { data?: Order }>,
        freshPaymentResponse.json() as Promise<ParsedCustomerApiPayload & { data?: Payment[] | Payment }>,
      ]);
      if (!freshOrderResponse.ok) {
        throw new Error(messageFromCustomerApiPayload(freshOrderResponse.status, freshOrderPayload, 'Sipariş bilgisi alınamadı.'));
      }
      if (!freshPaymentResponse.ok) {
        throw new Error(messageFromCustomerApiPayload(freshPaymentResponse.status, freshPaymentPayload, 'Ödeme bilgisi alınamadı.'));
      }
      setCart({ id: '', items: [] });
      const freshPayments = Array.isArray(freshPaymentPayload.data)
        ? freshPaymentPayload.data
        : freshPaymentPayload.data
          ? [freshPaymentPayload.data]
          : [paymentPayload.data];
      setOrder(freshOrderPayload.data ?? orderToPay);
      setPayments(freshPayments);
      const pay = latestPayment(freshPayments);
      const checkoutDone = freshOrderPayload.data?.status === 'CONFIRMED' || pay?.status === 'SUCCESS';
      router.replace(`/odeme?durum=${checkoutDone ? 'basarili' : 'beklemede'}&orderId=${orderToPay.id}`);
    } catch (e) {
      setError(customerFacingMessageFromUnknownError(e, 'Ödeme adımı tamamlanamadı.'));
      router.replace(
        orderIdForRecovery ? `/odeme?durum=basarisiz&orderId=${orderIdForRecovery}` : '/odeme?durum=basarisiz',
      );
    } finally { setBusy(false); }
  }
  const checkoutComplete = order?.status === 'CONFIRMED' || payment?.status === 'SUCCESS';
  const resumePaymentOnly = order?.status === 'PAYMENT_PENDING';
  const submitLocked = busy || checkoutComplete;
  const iyLocked = busy || iyBusy || checkoutComplete;
  const submitLabel = busy
    ? 'İşleniyor…'
    : checkoutComplete
      ? 'Tamamlandı'
      : payment?.status === 'PENDING'
        ? 'Ödemeyi yeniden dene'
        : resumePaymentOnly
          ? 'Ödemeyi başlat'
          : 'Siparişi oluştur ve ödemeyi başlat';
  if (!cart) return <p className="rounded-2xl bg-white p-4">Ödeme sayfası yükleniyor…</p>;
  const resumeOrderId = searchParams.get('orderId');
  if (!cart.items.length && !order) {
    if (resumeOrderId) return <p className="rounded-2xl bg-white p-4">Sipariş ve özet yükleniyor…</p>;
    return <div className="rounded-[2rem] border border-dashed border-amber-300 bg-white p-8 text-center"><h1 className="text-2xl font-semibold">Sepetiniz boş</h1><p className="mt-2 text-stone-600">Ödemeye geçmeden önce ürün ekleyin.</p><a className="mt-5 inline-block rounded-full bg-stone-900 px-5 py-3 text-white" href="/">Ürünlere dön</a></div>;
  }
  return <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
    <form className="space-y-5 rounded-[2rem] border border-amber-200/70 bg-white p-5 shadow-sm" onSubmit={handleSubmit(submit)}>
      <div><h1 className="text-2xl font-semibold">Ödeme</h1><p className="mt-1 text-sm text-stone-600">Teslimat ve ödeme bilgilerinizi tek adımda tamamlayın.</p>{process.env.NODE_ENV !== 'production' ? <p className="mt-2 rounded-2xl bg-amber-50 px-4 py-3 text-xs text-amber-900">Geliştirme modunda ödeme test bilgileri otomatik gelir; backend ödeme başarılı gibi tamamlar.</p> : null}</div>
      <fieldset className="grid gap-3 sm:grid-cols-2"><label className={`rounded-2xl border p-4 ${deliveryType === 'HOME_DELIVERY' ? 'border-amber-500 bg-amber-50' : ''}`}><input type="radio" value="HOME_DELIVERY" {...register('deliveryType')} /> <span className="ml-2">Adrese teslim</span></label><label className={`rounded-2xl border p-4 ${deliveryType === 'PICKUP' ? 'border-amber-500 bg-amber-50' : ''}`}><input type="radio" value="PICKUP" {...register('deliveryType')} /> <span className="ml-2">Mağazadan teslim</span></label></fieldset>
      {deliveryType === 'HOME_DELIVERY' ? <label className="block space-y-2"><span className="font-medium">Adres</span><select className="w-full rounded-2xl border px-4 py-3" {...register('addressId')}><option value="">Adres seçin</option>{addresses.map(a => <option key={a.id} value={a.id}>{a.title} — {a.district}</option>)}</select>{errors.addressId ? <span className="text-sm text-red-700">{errors.addressId.message}</span> : null}</label> : <label className="block space-y-2"><span className="font-medium">Mağaza</span><select className="w-full rounded-2xl border px-4 py-3" {...register('pickupStoreId')}><option value="">Mağaza seçin</option>{stores.map(s => <option key={s.id} value={s.id}>{s.name} — {s.district}</option>)}</select>{errors.pickupStoreId ? <span className="text-sm text-red-700">{errors.pickupStoreId.message}</span> : null}</label>}
      <label className="block space-y-2"><span className="font-medium">Sipariş notu</span><textarea className="min-h-24 w-full rounded-2xl border px-4 py-3" {...register('note')} /></label>
      <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2"><span className="font-medium">Kart sahibi</span><input className="w-full rounded-2xl border px-4 py-3" autoComplete="cc-name" {...register('cardHolderName')} />{errors.cardHolderName ? <span className="text-sm text-red-700">{errors.cardHolderName.message}</span> : null}</label><label className="space-y-2"><span className="font-medium">Kart numarası</span><input className="w-full rounded-2xl border px-4 py-3" inputMode="numeric" maxLength={16} autoComplete="cc-number" {...regCard} onChange={(e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 16); regCard.onChange(e); }} />{errors.cardNumber ? <span className="text-sm text-red-700">{errors.cardNumber.message}</span> : null}</label></div>
      <div className="grid grid-cols-3 gap-3">
        <label className="space-y-2">
          <span className="text-sm font-medium">Ay</span>
          <input className="w-full rounded-2xl border px-4 py-3" inputMode="numeric" maxLength={2} placeholder="01" title="Son kullanma ayı (01–12)" autoComplete="cc-exp-month" {...regMonth} onChange={(e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 2); regMonth.onChange(e); }} />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Yıl</span>
          <input className="w-full rounded-2xl border px-4 py-3" inputMode="numeric" maxLength={2} placeholder="28" title="Son kullanma yılı (2 hane)" autoComplete="cc-exp-year" {...regYear} onChange={(e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 2); regYear.onChange(e); }} />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Güvenlik (CVC)</span>
          <input className="w-full rounded-2xl border px-4 py-3" inputMode="numeric" maxLength={3} placeholder="•••" title="Kart güvenlik kodu (3 rakam)" autoComplete="cc-csc" {...regCvc} onChange={(e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 3); regCvc.onChange(e); }} />
        </label>
      </div>
      <p className="text-xs text-stone-500">Kart numarası 16 hane; son kullanma yılı kart üzerindeki son iki hanedir; güvenlik kodu 3 rakamdır.</p>
      {(errors.expireMonth ?? errors.expireYear ?? errors.cvc) ? (
        <p className="text-sm text-red-700">
          {[errors.expireMonth?.message, errors.expireYear?.message, errors.cvc?.message].filter(Boolean).join(' ')}
        </p>
      ) : null}
      <div className="space-y-3 border-t border-amber-100 pt-4">
        <p className="text-sm font-medium text-stone-700">İyzico ile ödeme</p>
        <p className="text-xs text-stone-500">Kart bilgisi girmeden iyzico güvenli ödeme formunda tamamlayın; form yüklendikten sonra işlemi orada bitirin.</p>
        <div ref={iyRef} id="iyzipay-checkout-form" className="responsive min-h-[40px]" />
        <button
          className="w-full rounded-2xl border-2 border-amber-600 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-950 disabled:opacity-60"
          disabled={iyLocked}
          type="button"
          onClick={() => void payWithIyzico()}
        >
          {iyBusy ? 'iyzico formu yükleniyor…' : 'İyzico ile ödeme al'}
        </button>
      </div>
      {error ? <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</p> : null}
      <button className="w-full rounded-2xl bg-stone-900 px-5 py-4 font-medium text-white disabled:opacity-60" disabled={submitLocked} type="submit">{submitLabel}</button>
    </form>
    <aside className="rounded-[2rem] bg-stone-900 p-5 text-white"><h2 className="text-lg font-semibold">Kesin toplam</h2>{order ? <dl className="mt-4 space-y-3 text-sm"><div className="flex justify-between"><dt>Ara toplam</dt><dd>{formatTry(order.subtotal)}</dd></div><div className="flex justify-between"><dt>Teslimat</dt><dd>{formatTry(order.deliveryFee)}</dd></div>{order.serviceFee ? <div className="flex justify-between"><dt>Servis</dt><dd>{formatTry(order.serviceFee)}</dd></div> : null}{order.loyaltyDiscount && Number(order.loyaltyDiscount) > 0 ? <div className="flex justify-between text-emerald-300"><dt>Puan indirimi{order.loyaltyPointsUsed ? ` (${order.loyaltyPointsUsed} puan)` : ''}</dt><dd>-{formatTry(order.loyaltyDiscount)}</dd></div> : null}<div className="flex justify-between border-t border-white/20 pt-3 text-base font-semibold"><dt>Genel toplam</dt><dd>{formatTry(order.grandTotal)}</dd></div></dl> : <p className="mt-4 text-sm text-stone-300">Kesin toplam sipariş oluşturulduktan sonra sunucudan alınır.</p>}{payment ? <div className="mt-5 rounded-2xl bg-amber-300 p-4 text-stone-950"><p className="font-semibold">{paymentStatusLabel(payment.status)}</p>{payment.status === 'SUCCESS' ? <p className="mt-1 text-sm">Siparişiniz {order?.orderNumber} numarasıyla onaylandı. Ödeme tamamlandı.</p> : <p className="mt-1 text-sm">Siparişiniz {order?.orderNumber} numarasıyla oluşturuldu. Ödeme sağlayıcı akışı başlatıldı.</p>}{payment.processingResult ? <p className="mt-1 text-xs">İşlem sonucu: {payment.processingResult}</p> : null}</div> : null}</aside>
  </div>;
}