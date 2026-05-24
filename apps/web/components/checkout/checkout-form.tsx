'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { checkoutDeliveryOnlySchema, type CheckoutDeliveryOnlyValues } from '../../lib/checkout/schemas';
import type { Address, Order, Payment, Store } from '../../lib/checkout/types';
import type { Cart } from '../../lib/cart/types';
import { fetchCart, validateCartForCheckout } from '../../lib/cart/queries';
import { customerFacingMessageFromUnknownError, messageFromCustomerApiPayload, type ParsedCustomerApiPayload } from '../../lib/messages/customer-facing-errors';
import { paymentStatusLabel } from '../../lib/orders/status';
import { formatTry } from '../shared/price';

function latestPayment(payments: Payment[]): Payment | null {
  return payments[0] ?? null;
}

function cartEstimate(cart: Cart): string {
  return cart.items.reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0).toFixed(2);
}

export function CheckoutForm(): React.JSX.Element {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [cart, setCart] = useState<Cart | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [iyCheckoutHtml, setIyCheckoutHtml] = useState<string | null>(null);
  const iyRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const payment = latestPayment(payments);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CheckoutDeliveryOnlyValues>({
    resolver: zodResolver(checkoutDeliveryOnlySchema),
    defaultValues: { deliveryType: 'HOME_DELIVERY' },
  });
  const deliveryType = watch('deliveryType');

  useEffect(() => {
    async function loadCheckout(): Promise<void> {
      const [a, s] = await Promise.all([fetch('/api/addresses').then((r) => r.json()), fetch('/api/stores').then((r) => r.json())]);
      const storePayload = s.data as Store[] | { items?: Store[] } | undefined;
      const storeList = Array.isArray(storePayload) ? storePayload : (storePayload?.items ?? []);
      setAddresses(a.data ?? []);
      setStores(storeList);
      try {
        setCart(await validateCartForCheckout());
      } catch (err) {
        setError(customerFacingMessageFromUnknownError(err, 'Sepet ödeme için doğrulanamadı.'));
        setCart(await fetchCart().catch(() => ({ id: '', items: [] })));
        window.dispatchEvent(new Event('cart:changed'));
      }
    }
    void loadCheckout().catch(() => setError('Ödeme bilgileri yüklenemedi. Lütfen sayfayı yenileyin.'));
  }, []);

  useEffect(() => {
    const orderId = searchParams.get('orderId');
    const status = searchParams.get('durum');
    if (status === 'basarisiz') {
      setError((prev) => {
        if (prev) return prev;
        return orderId
          ? 'Ödeme tamamlanamadı. Tekrar deneyin veya yeni sipariş için sepeti yenileyin.'
          : 'Ödeme başlatılamadı. Oturum veya ağ hatası olabilir; API sunucusunun çalıştığından emin olun.';
      });
    }
    if (status === 'basarili') setError(null);
    if (!orderId) return;
    void Promise.all([
      fetch(`/api/orders/${orderId}`, { cache: 'no-store' }).then((r) => r.json()),
      fetch(`/api/payments/${orderId}`, { cache: 'no-store' }).then((r) => r.json()),
    ])
      .then(([o, p]) => {
        setOrder(o.data ?? null);
        setPayments(Array.isArray(p.data) ? p.data : p.data ? [p.data] : []);
      })
      .catch(() => setError('Sipariş veya ödeme bilgisi alınamadı. Lütfen tekrar deneyin.'));
  }, [searchParams]);

  async function resolveOrderToPay(
    fields: Pick<CheckoutDeliveryOnlyValues, 'deliveryType' | 'addressId' | 'pickupStoreId' | 'note'>,
    pendingOrder: Order | null,
  ): Promise<Order> {
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

  async function refreshCartAfterCheckoutFailure(): Promise<void> {
    const nextCart = await fetchCart().catch(() => null);
    if (!nextCart) return;
    setCart(nextCart);
    window.dispatchEvent(new Event('cart:changed'));
  }

  async function payWithIyzico(values: CheckoutDeliveryOnlyValues): Promise<void> {
    setBusy(true);
    setError(null);
    setIyCheckoutHtml(null);
    try {
      const orderToPay = await resolveOrderToPay(values, order);
      const paymentResponse = await fetch('/api/payments/checkout-form-init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'idempotency-key': `${orderToPay.id}:iyzico-web` },
        body: JSON.stringify({ orderId: orderToPay.id }),
      });
      const paymentPayload = (await paymentResponse.json()) as ParsedCustomerApiPayload & {
        data?: { checkoutFormContent?: string };
      };
      if (!paymentResponse.ok || typeof paymentPayload.data?.checkoutFormContent !== 'string') {
        throw new Error(messageFromCustomerApiPayload(paymentResponse.status, paymentPayload, 'iyzico ödeme formu başlatılamadı.'));
      }
      setIyCheckoutHtml(paymentPayload.data.checkoutFormContent);
      void Promise.all([
        fetch(`/api/orders/${orderToPay.id}`, { cache: 'no-store' }).then((r) => r.json()),
        fetch(`/api/payments/${orderToPay.id}`, { cache: 'no-store' }).then((r) => r.json()),
      ])
        .then(([o, p]) => {
          setOrder(o.data ?? orderToPay);
          setPayments(Array.isArray(p.data) ? p.data : p.data ? [p.data] : []);
        })
        .catch(() => undefined);
      requestAnimationFrame(() => iyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
    } catch (e) {
      await refreshCartAfterCheckoutFailure();
      setError(customerFacingMessageFromUnknownError(e, 'iyzico ödemesi başlatılamadı.'));
    } finally {
      setBusy(false);
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

  const checkoutComplete = order?.status === 'CONFIRMED' || payment?.status === 'SUCCESS';
  const payLocked = busy || checkoutComplete;
  const payLabel = busy ? 'Yükleniyor…' : checkoutComplete ? 'Ödeme tamamlandı' : 'İyzico ile öde';

  if (!cart) return <p className="stitch-panel rounded-3xl p-4">Ödeme sayfası yükleniyor...</p>;

  const resumeOrderId = searchParams.get('orderId');
  if (!cart.items.length && !order) {
    if (resumeOrderId) return <p className="stitch-panel rounded-3xl p-4">Sipariş ve özet yükleniyor...</p>;
    return (
      <div className="stitch-panel rounded-3xl p-10 text-center">
        <h1 className="font-display text-3xl font-semibold text-primary">Sepetiniz boş</h1>
        <p className="mt-2 text-muted">Ödemeye geçmeden önce ürün ekleyin.</p>
        <a className="stitch-button mt-5" href="/">
          Ürünlere dön
        </a>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
      <form className="space-y-6" onSubmit={handleSubmit((values) => void payWithIyzico(values))}>
        <section className="stitch-panel rounded-3xl p-6">
          <div className="mb-5 flex items-start gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
              1
            </span>
            <div>
              <h2 className="font-display text-2xl font-semibold text-primary">Teslimat yöntemi</h2>
              <p className="mt-1 text-sm text-muted">Adrese teslim veya mağazadan teslim alma seçimini yapın.</p>
            </div>
          </div>
          <fieldset className="grid gap-3 sm:grid-cols-2">
            <label
              className={`cursor-pointer rounded-2xl border p-4 transition ${deliveryType === 'HOME_DELIVERY' ? 'border-primary bg-primary-fixed' : 'border-outline-soft/60 bg-white hover:border-primary'}`}
            >
              <input className="sr-only" type="radio" value="HOME_DELIVERY" {...register('deliveryType')} />
              <span className="block font-semibold text-primary">Adrese teslim</span>
              <span className="mt-1 block text-sm text-muted">Kayıtlı adresinize kurye teslimatı.</span>
            </label>
            <label
              className={`cursor-pointer rounded-2xl border p-4 transition ${deliveryType === 'PICKUP' ? 'border-primary bg-primary-fixed' : 'border-outline-soft/60 bg-white hover:border-primary'}`}
            >
              <input className="sr-only" type="radio" value="PICKUP" {...register('deliveryType')} />
              <span className="block font-semibold text-primary">Mağazadan teslim</span>
              <span className="mt-1 block text-sm text-muted">Siparişinizi seçili mağazadan alın.</span>
            </label>
          </fieldset>

          <div className="mt-5">
            {deliveryType === 'HOME_DELIVERY' ? (
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-ink">Teslimat adresi</span>
                <select
                  className="w-full rounded-2xl border border-outline-soft/60 bg-white px-4 py-3 outline-none focus:border-primary"
                  {...register('addressId')}
                >
                  <option value="">Adres seçin</option>
                  {addresses.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title} - {a.district}
                    </option>
                  ))}
                </select>
                {errors.addressId ? <span className="text-sm text-red-700">{errors.addressId.message}</span> : null}
              </label>
            ) : (
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-ink">Teslim alınacak mağaza</span>
                <select
                  className="w-full rounded-2xl border border-outline-soft/60 bg-white px-4 py-3 outline-none focus:border-primary"
                  {...register('pickupStoreId')}
                >
                  <option value="">Mağaza seçin</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} - {s.district}
                    </option>
                  ))}
                </select>
                {errors.pickupStoreId ? (
                  <span className="text-sm text-red-700">{errors.pickupStoreId.message}</span>
                ) : null}
              </label>
            )}
          </div>

          <label className="mt-5 block space-y-2">
            <span className="text-sm font-semibold text-ink">Sipariş notu</span>
            <textarea
              className="min-h-24 w-full rounded-2xl border border-outline-soft/60 bg-white px-4 py-3 outline-none focus:border-primary"
              placeholder="Teslimat saati, kapı kodu veya ürün notu"
              {...register('note')}
            />
          </label>
        </section>

        <section className="stitch-panel rounded-3xl p-6">
          <div className="mb-5 flex items-start gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
              2
            </span>
            <div>
              <h2 className="font-display text-2xl font-semibold text-primary">Ödeme</h2>
              <p className="mt-1 text-sm text-muted">Kart bilgilerinizi iyzico güvenli ödeme formunda tamamlayın.</p>
            </div>
          </div>

          <button className="stitch-button w-full disabled:opacity-60" disabled={payLocked} type="submit">
            {payLabel}
          </button>

          <div ref={iyRef} id="iyzipay-checkout-form" className="responsive mt-5 min-h-[40px]" />

          {error ? <p className="mt-5 rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</p> : null}
        </section>
      </form>

      <aside className="h-fit space-y-5 lg:sticky lg:top-28">
        <section className="rounded-3xl bg-primary p-6 text-white shadow-ambient">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">Sipariş özeti</p>
          <h2 className="mt-2 font-display text-3xl font-semibold">Kesin toplam</h2>
          <div className="mt-6 space-y-3">
            {cart.items.map((item) => (
              <div className="flex justify-between gap-4 text-sm text-white/75" key={item.id}>
                <span>
                  {item.quantity} x {item.product.name}
                </span>
                <span className="font-semibold text-white">{formatTry((Number(item.unitPrice) * item.quantity).toFixed(2))}</span>
              </div>
            ))}
          </div>
          {order ? (
            <dl className="mt-6 space-y-3 border-t border-white/15 pt-5 text-sm">
              <div className="flex justify-between">
                <dt>Ara toplam</dt>
                <dd>{formatTry(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Teslimat</dt>
                <dd>{formatTry(order.deliveryFee)}</dd>
              </div>
              {order.serviceFee ? (
                <div className="flex justify-between">
                  <dt>Servis</dt>
                  <dd>{formatTry(order.serviceFee)}</dd>
                </div>
              ) : null}
              {order.loyaltyDiscount && Number(order.loyaltyDiscount) > 0 ? (
                <div className="flex justify-between text-emerald-200">
                  <dt>Puan indirimi{order.loyaltyPointsUsed ? ` (${order.loyaltyPointsUsed} puan)` : ''}</dt>
                  <dd>-{formatTry(order.loyaltyDiscount)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between border-t border-white/20 pt-4 text-lg font-semibold">
                <dt>Genel toplam</dt>
                <dd>{formatTry(order.grandTotal)}</dd>
              </div>
            </dl>
          ) : (
            <div className="mt-6 border-t border-white/15 pt-5">
              <div className="flex justify-between text-lg font-semibold">
                <span>Sepet toplamı</span>
                <span>{formatTry(cartEstimate(cart))}</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-white/60">
                Kesin toplam sipariş oluşturulduktan sonra teslimat ücretiyle hesaplanır.
              </p>
            </div>
          )}
        </section>

        {payment ? (
          <section className="rounded-3xl border border-outline-soft/40 bg-honey/40 p-5 text-primary">
            <p className="font-semibold">{paymentStatusLabel(payment.status)}</p>
            {payment.status === 'SUCCESS' ? (
              <p className="mt-1 text-sm">
                Siparişiniz {order?.orderNumber} numarasıyla onaylandı. Ödeme tamamlandı.
              </p>
            ) : (
              <p className="mt-1 text-sm">
                Siparişiniz {order?.orderNumber} numarasıyla oluşturuldu. iyzico ödeme adımını tamamlayın.
              </p>
            )}
            {payment.processingResult ? (
              <p className="mt-1 text-xs">İşlem sonucu: {payment.processingResult}</p>
            ) : null}
          </section>
        ) : null}
      </aside>
    </div>
  );
}
