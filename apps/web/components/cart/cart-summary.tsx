import type { Cart } from '../../lib/cart/types';
import { formatTry } from '../shared/price';

function cartEstimate(cart: Cart): string {
  const total = cart.items.reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0);
  return total.toFixed(2);
}

export function CartSummary({ cart }: Readonly<{ cart: Cart }>): React.JSX.Element {
  return (
    <aside className="sticky top-28 h-fit rounded-3xl bg-primary p-6 text-white shadow-ambient">
      <h2 className="font-display text-2xl font-semibold sm:text-3xl">Sipariş özeti</h2>
      <p className="mt-3 text-sm text-white/70">{cart.items.length} ürün satırı</p>
      <dl className="mt-8 space-y-4 text-base">
        <div className="flex items-baseline justify-between gap-4 border-b border-white/15 pb-4">
          <dt className="text-lg font-semibold sm:text-xl">Sepet ara toplamı</dt>
          <dd className="font-body text-xl font-extrabold tabular-nums sm:text-2xl">{formatTry(cartEstimate(cart))}</dd>
        </div>
      </dl>
      <a
        className="mt-8 block rounded-full bg-honey px-5 py-4 text-center text-sm font-bold uppercase tracking-[0.14em] text-primary transition hover:bg-gold"
        href="/odeme"
      >
        Ödemeye geç
      </a>
    </aside>
  );
}
