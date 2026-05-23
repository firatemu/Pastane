'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CustomerSession } from '../../lib/auth/types';
import type { Cart } from '../../lib/cart/types';
import type { Category } from '../../lib/catalog/types';
import { fetchCart } from '../../lib/cart/queries';
import { formatTry } from '../shared/price';

function cartQuantity(cart: Cart | null): number {
  return cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
}

function cartTotal(cart: Cart | null): string {
  const total = cart?.items.reduce((sum, item) => {
    const optionTotal = (item.options ?? []).reduce((optionSum, { option }) => optionSum + Number(option.priceModifier), 0);
    return sum + (Number(item.unitPrice) + optionTotal) * item.quantity;
  }, 0) ?? 0;
  return total.toFixed(2);
}

export function StorefrontHeader({ categories = [], session }: Readonly<{ categories?: Category[]; session?: CustomerSession | undefined }>): React.JSX.Element {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const quantity = cartQuantity(cart);

  useEffect(() => {
    if (!session) return undefined;
    let active = true;
    async function loadCart(): Promise<void> {
      try {
        const nextCart = await fetchCart();
        if (active) setCart(nextCart);
      } catch {
        if (active) setCart(null);
      }
    }
    void loadCart();
    window.addEventListener('cart:changed', loadCart);
    window.addEventListener('focus', loadCart);
    return () => {
      active = false;
      window.removeEventListener('cart:changed', loadCart);
      window.removeEventListener('focus', loadCart);
    };
  }, [session]);

  async function logout(): Promise<void> {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/');
    router.refresh();
  }
  return (
    <header className="fixed top-0 z-50 w-full border-b border-outline-soft/30 bg-surface-container/95 text-primary backdrop-blur">
      <div className="stitch-container flex min-h-[88px] items-center justify-between gap-4 py-4">
        <div className="flex items-center gap-8">
          <a className="font-display text-2xl font-bold text-primary sm:text-3xl" href="/">Pasta-Hane</a>
          <nav className="hidden max-w-[56vw] items-center gap-4 overflow-x-auto whitespace-nowrap text-[0.68rem] font-bold uppercase tracking-[0.12em] text-muted md:flex lg:gap-5">
            <a className="hover:text-primary" href="/shop">Tüm ürünler</a>
            {categories.map((category) => (
              <a className="hover:text-primary" href={`/kategori/${category.slug}`} key={category.id}>
                {category.name}
              </a>
            ))}
          </nav>
        </div>
        <nav className="flex items-center gap-1 text-sm sm:gap-2">
          {session ? (
            <>
              <div className="group relative">
                <a className="flex items-center gap-2 rounded-2xl bg-surface-lowest px-3 py-2 font-semibold text-primary hover:bg-surface-low sm:px-4" href="/sepet">
                  <span className="relative inline-flex h-8 w-8 items-center justify-center" aria-hidden="true">
                    <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
                      <path d="M3 4h2l2.6 10.5a2 2 0 0 0 2 1.5h7.8a2 2 0 0 0 1.9-1.4L21 8H7" />
                      <path d="M9 20h.01" />
                      <path d="M17 20h.01" />
                    </svg>
                    {quantity > 0 ? (
                      <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-surface-lowest bg-error px-1 text-[11px] font-bold leading-none text-white">
                        {quantity > 99 ? '99+' : quantity}
                      </span>
                    ) : null}
                  </span>
                  <span>Sepet</span>
                </a>
                {quantity > 0 ? (
                  <div className="pointer-events-none absolute right-0 top-full hidden min-w-56 pt-3 group-hover:block">
                    <div className="stitch-panel rounded-2xl p-4 text-sm shadow-ambient">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-secondary">Mini sepet</p>
                      <div className="mt-3 flex items-center justify-between gap-5">
                        <span className="text-muted">{quantity} ürün</span>
                        <span className="font-display text-xl font-semibold text-primary">{formatTry(cartTotal(cart))}</span>
                      </div>
                      <p className="mt-2 text-xs text-muted/80">Kesin tutar ödeme adımında hesaplanır.</p>
                    </div>
                  </div>
                ) : null}
              </div>
              <a className="hidden rounded-full px-4 py-2 font-semibold text-muted hover:bg-surface-lowest hover:text-primary sm:inline-flex" href="/siparisler">Siparişler</a>
              <a className="rounded-full px-3 py-2 font-semibold text-muted hover:bg-surface-lowest hover:text-primary sm:px-4" href="/hesabim">Hesabım</a>
              <button className="rounded-full border border-outline-soft/70 bg-surface-lowest px-3 py-2 font-semibold text-primary hover:bg-surface-low sm:px-4" onClick={logout} type="button">Çıkış</button>
            </>
          ) : (
            <>
              <a className="rounded-full px-4 py-2 font-semibold text-muted hover:bg-surface-lowest hover:text-primary" href="/giris">Giriş</a>
              <a className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold uppercase tracking-[0.12em] text-white hover:bg-primary-container" href="/kayit">Kayıt</a>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
