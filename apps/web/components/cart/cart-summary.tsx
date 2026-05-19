import type { Cart } from '../../lib/cart/types';
import { formatTry } from '../shared/price';

function cartEstimate(cart: Cart): string {
  const total = cart.items.reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0);
  return total.toFixed(2);
}

export function CartSummary({ cart }: Readonly<{ cart: Cart }>): React.JSX.Element {
  return <aside className="rounded-[2rem] bg-stone-900 p-5 text-white"><h2 className="text-lg font-semibold">Sipariş özeti</h2><p className="mt-3 text-sm text-stone-300">{cart.items.length} ürün satırı</p><dl className="mt-4 space-y-2 text-sm"><div className="flex justify-between"><dt>Sepet ara toplamı</dt><dd>{formatTry(cartEstimate(cart))}</dd></div></dl><p className="mt-3 text-xs text-stone-300">Bu sepet özeti backend cart fiyatlarından hesaplanan bilgilendirme amaçlı ara toplamdır. Kesin toplam, stok ve teslimat ücreti ödeme adımında sunucu tarafından yeniden hesaplanır.</p><a className="mt-5 block rounded-full bg-amber-300 px-5 py-3 text-center font-medium text-stone-950" href="/odeme">Ödemeye geç</a></aside>;
}