import { CartPageClient } from '../../../components/cart/cart-page-client';
export default function CartPage(): React.JSX.Element {
  return (
    <main className="stitch-container py-10 sm:py-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-outline-soft/30 pb-6">
        <div>
        <p className="stitch-eyebrow">Seçiminiz</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-primary sm:text-5xl">Sepetim</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Ürünlerinizi kontrol edin, adetleri düzenleyin ve güvenli ödeme adımına geçin.</p>
        </div>
        <a className="rounded-full border border-outline-soft/60 px-5 py-3 text-sm font-bold text-primary hover:border-primary" href="/shop">Alışverişe devam et</a>
      </div>
      <CartPageClient />
    </main>
  );
}
