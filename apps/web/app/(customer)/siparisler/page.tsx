import { Suspense } from 'react';
import { OrderHistoryClient } from '../../../components/orders/order-history-client';

export default function OrdersPage(): React.JSX.Element {
  return (
    <main className="stitch-container max-w-2xl py-10 font-body sm:py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Siparişler</h1>
      <Suspense fallback={<p className="mt-8 text-base text-muted">Yükleniyor…</p>}>
        <OrderHistoryClient />
      </Suspense>
    </main>
  );
}
