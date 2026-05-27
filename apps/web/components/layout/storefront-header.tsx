'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CustomerSession } from '../../lib/auth/types';
import type { Cart } from '../../lib/cart/types';
import { fetchCart } from '../../lib/cart/queries';
import type { Product } from '../../lib/catalog/types';
import { productLabel } from '../../lib/catalog/product-label';
import { stitchImages } from '../../lib/stitch-design';
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

function normalized(value: string | null | undefined): string {
  return (value ?? '').toLocaleLowerCase('tr-TR').trim();
}

function HeaderSearch({
  className,
  inputClassName,
  onNavigate,
  products,
  search,
  setSearch,
}: Readonly<{
  className?: string;
  inputClassName: string;
  onNavigate?: () => void;
  products: Product[];
  search: string;
  setSearch: (value: string) => void;
}>): React.JSX.Element {
  const router = useRouter();
  const [focused, setFocused] = useState(false);
  const query = normalized(search);
  const results = useMemo(() => {
    if (query.length < 2) return [];
    return products
      .filter((product) => {
        const haystack = [
          productLabel(product),
          product.name,
          product.shortDescription,
          product.description,
          product.category.name,
        ].map((value) => normalized(value));
        return haystack.some((value) => value.includes(query));
      })
      .slice(0, 6);
  }, [products, query]);

  function submitSearch(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const q = search.trim();
    router.push(q ? `/shop?q=${encodeURIComponent(q)}` : '/shop');
    setFocused(false);
    onNavigate?.();
  }

  function goProduct(product: Product): void {
    setSearch(productLabel(product));
    setFocused(false);
    onNavigate?.();
    router.push(`/urun/${product.slug}`);
  }

  const showResults = focused && query.length >= 2;

  return (
    <form className={`relative ${className ?? ''}`} onSubmit={submitSearch}>
        <input
          aria-label="Ürün ara"
          className={inputClassName}
          onBlur={() => window.setTimeout(() => setFocused(false), 120)}
          onChange={(event) => setSearch(event.target.value)}
          onFocus={() => setFocused(true)}
          placeholder="Pasta, tatlı, dondurma ara"
          type="search"
          value={search}
        />
        <button className="absolute right-1.5 top-1.5 rounded-full bg-primary px-4 py-2 text-xs font-extrabold uppercase tracking-[0.12em] text-white hover:bg-primary-container sm:px-5" type="submit">Ara</button>
        {showResults ? (
          <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-3xl border border-outline-soft/50 bg-white p-2 shadow-ambient">
            {results.length ? (
              <div className="max-h-96 overflow-y-auto">
                {results.map((product) => {
                  const image = product.images.find((item) => item.isPrimary) ?? product.images[0];
                  return (
                    <button
                      className="flex w-full items-center gap-3 rounded-2xl p-2 text-left transition hover:bg-surface-low"
                      key={product.id}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => goProduct(product)}
                      type="button"
                    >
                      <span className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-surface-low">
                        <img alt={image?.altText ?? product.name} className="h-full w-full object-cover" src={image?.url ?? stitchImages.tart} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-extrabold text-primary">{productLabel(product)}</span>
                        <span className="mt-0.5 block truncate text-xs font-semibold text-muted">{product.category.name}</span>
                      </span>
                      <span className="shrink-0 text-sm font-extrabold text-error">{formatTry(product.discountedPrice ?? product.price)}</span>
                    </button>
                  );
                })}
                <button
                  className="mt-1 flex w-full items-center justify-center rounded-2xl bg-surface-low px-4 py-3 text-sm font-extrabold text-primary hover:bg-surface-high"
                  onMouseDown={(event) => event.preventDefault()}
                  type="submit"
                >
                  Tüm sonuçları göster
                </button>
              </div>
            ) : (
              <div className="rounded-2xl bg-surface-low px-4 py-3 text-sm font-semibold text-muted">Ürün bulunamadı.</div>
            )}
          </div>
        ) : null}
    </form>
  );
}

export function StorefrontHeader({ searchProducts, session }: Readonly<{ searchProducts: Product[]; session?: CustomerSession | undefined }>): React.JSX.Element {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState('');
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
    <header className="fixed top-0 z-50 w-full border-b border-outline-soft/30 bg-white/92 text-primary shadow-[0_10px_40px_rgba(26,28,26,0.06)] backdrop-blur">
      <div className="stitch-container relative flex min-h-[88px] items-center justify-between gap-3 py-4">
        <a className="relative z-10 shrink-0 font-display text-2xl font-bold text-primary sm:text-3xl" href="/">
          Pasta-Hane
        </a>
        <div className="hidden flex-1 items-center justify-center gap-5 lg:flex">
          <nav className="flex items-center gap-4 text-sm font-bold" aria-label="Ana menü">
            <a className="hover:text-secondary" href="/shop">Vitrin</a>
            <a className="hover:text-secondary" href="/#collections">Çok satanlar</a>
          </nav>
          <HeaderSearch
            className="w-full max-w-md"
            inputClassName="h-12 w-full rounded-full border border-outline-soft/50 bg-surface-low px-5 pr-24 text-sm font-semibold outline-none transition placeholder:text-muted/60 focus:border-primary focus:bg-white sm:pr-28"
            products={searchProducts}
            search={search}
            setSearch={setSearch}
          />
        </div>
        <nav className="relative z-10 flex shrink-0 items-center gap-1 text-sm sm:gap-2">
          <button className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-outline-soft/60 bg-surface-lowest text-primary lg:hidden" onClick={() => setMobileOpen((open) => !open)} type="button" aria-label="Menüyü aç">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
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
                    <div className="stitch-panel rounded-2xl p-4 font-body text-base shadow-ambient">
                      <p className="text-sm font-semibold text-primary">Mini sepet</p>
                      <div className="mt-3 flex items-center justify-between gap-5">
                        <span className="text-muted">{quantity} ürün</span>
                        <span className="text-lg font-bold tabular-nums text-primary">{formatTry(cartTotal(cart))}</span>
                      </div>
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
              <a className="flex items-center gap-2 rounded-2xl bg-surface-lowest px-3 py-2 font-semibold text-primary hover:bg-surface-low sm:px-4" href="/sepet">
                <span className="relative inline-flex h-8 w-8 items-center justify-center" aria-hidden="true">
                  <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
                    <path d="M3 4h2l2.6 10.5a2 2 0 0 0 2 1.5h7.8a2 2 0 0 0 1.9-1.4L21 8H7" />
                    <path d="M9 20h.01" />
                    <path d="M17 20h.01" />
                  </svg>
                </span>
                <span className="hidden sm:inline">Sepet</span>
              </a>
              <a className="hidden rounded-full px-4 py-2 font-semibold text-muted hover:bg-surface-lowest hover:text-primary sm:inline-flex" href="/giris">Giriş</a>
              <a className="rounded-full bg-primary px-4 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-white hover:bg-primary-container sm:px-5 sm:text-sm" href="/kayit">Kayıt</a>
            </>
          )}
        </nav>
      </div>
      {mobileOpen ? (
        <div className="border-t border-outline-soft/30 bg-white lg:hidden">
          <div className="stitch-container grid gap-3 py-4">
            <HeaderSearch
              inputClassName="h-12 w-full rounded-full border border-outline-soft/60 bg-surface-low px-5 pr-24 text-sm font-semibold outline-none"
              onNavigate={() => setMobileOpen(false)}
              products={searchProducts}
              search={search}
              setSearch={setSearch}
            />
            <div className="flex gap-2 overflow-x-auto pb-1">
              <a className="shrink-0 rounded-full bg-surface-low px-4 py-2 text-sm font-bold text-primary" href="/shop">Vitrin</a>
              <a className="shrink-0 rounded-full bg-surface-low px-4 py-2 text-sm font-bold text-primary" href="/#collections">Çok satanlar</a>
              <a className="shrink-0 rounded-full bg-surface-low px-4 py-2 text-sm font-bold text-primary" href="/sepet">Sepet</a>
              <a className="shrink-0 rounded-full bg-surface-low px-4 py-2 text-sm font-bold text-primary" href="/giris">Giriş</a>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
