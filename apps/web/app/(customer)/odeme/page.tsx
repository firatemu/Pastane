import { Suspense } from 'react';
import { CheckoutForm } from '../../../components/checkout/checkout-form';
export default function CheckoutPage(): React.JSX.Element {
  return (
    <main className="stitch-container py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-outline-soft/30 pb-6">
        <div>
          <p className="stitch-eyebrow">Güvenli Checkout</p>
          <h1 className="mt-2 font-display text-4xl font-semibold text-primary">Ödeme ve teslimat</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Teslimat seçimini, sipariş notunu ve ödeme yöntemini tek akışta tamamlayın.
          </p>
        </div>
        <a className="rounded-full border border-outline-soft/60 px-5 py-3 text-sm font-semibold text-primary hover:border-primary" href="/sepet">
          Sepete dön
        </a>
      </div>
      <Suspense fallback={<p className="stitch-panel rounded-3xl p-4">Ödeme sayfası yükleniyor...</p>}>
        <CheckoutForm />
      </Suspense>
    </main>
  );
}
