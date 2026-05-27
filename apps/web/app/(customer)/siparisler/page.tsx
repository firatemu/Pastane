import { Suspense } from 'react';
import { OrderHistoryClient } from '../../../components/orders/order-history-client';

export default function OrdersPage(): React.JSX.Element {
  return (
    <main className="stitch-container py-10 sm:py-12">
      <header className="mb-8 overflow-hidden rounded-[2rem] bg-primary p-6 text-white shadow-ambient sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Siparişlerim</p>
          <h1 className="mt-2 font-display text-4xl font-bold sm:text-5xl">Sipariş geçmişi</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">Aktif siparişleri takip edin, geçmiş siparişlerin detaylarına ve ödeme durumlarına ulaşın.</p>
        </div>
        <a className="rounded-full bg-honey px-5 py-3 text-sm font-bold text-primary hover:bg-gold" href="/shop">Yeni sipariş ver</a>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-gold">Takip</p>
            <p className="mt-1 text-sm text-white/75">Canlı durum güncellemeleri</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-gold">Ödeme</p>
            <p className="mt-1 text-sm text-white/75">İyzico kayıtları görünür</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-gold">Teslimat</p>
            <p className="mt-1 text-sm text-white/75">Kurye ve teslim süreci</p>
          </div>
        </div>
      </header>
      <Suspense fallback={<p className="mt-8 text-base text-muted">Yükleniyor…</p>}>
        <OrderHistoryClient />
      </Suspense>
    </main>
  );
}
