'use client';

import { useRouter } from 'next/navigation';
import type { CustomerSession } from '../../lib/auth/types';

export function StorefrontHeader({ session }: Readonly<{ session?: CustomerSession }>): React.JSX.Element {
  const router = useRouter();
  async function logout(): Promise<void> {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/');
    router.refresh();
  }
  return (
    <header className="border-b border-amber-200/70 bg-[#fffaf3]/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <a className="text-xl font-semibold tracking-tight text-stone-950" href="/">Pastane</a>
        <nav className="flex items-center gap-2 text-sm">
          {session ? (
            <>
              <a className="rounded-full px-4 py-2 font-medium text-stone-700 hover:bg-white" href="/sepet">Sepet</a>
              <a className="rounded-full px-4 py-2 font-medium text-stone-700 hover:bg-white" href="/siparisler">Siparişler</a>
              <a className="rounded-full px-4 py-2 font-medium text-stone-700 hover:bg-white" href="/hesabim">Hesabım</a>
              <button className="rounded-full border border-amber-300 bg-white px-4 py-2 font-medium hover:bg-amber-50" onClick={logout} type="button">Çıkış</button>
            </>
          ) : (
            <>
              <a className="rounded-full px-4 py-2 font-medium text-stone-700 hover:bg-white" href="/giris">Giriş</a>
              <a className="rounded-full bg-stone-900 px-4 py-2 font-medium text-white hover:bg-stone-800" href="/kayit">Kayıt ol</a>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
