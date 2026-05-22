'use client';
import { useRouter } from 'next/navigation';
import type { CourierSession } from '../../lib/auth/types';

export function CourierTopbar({ session }: { session: CourierSession }): React.JSX.Element {
  const router = useRouter();
  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }
  return (
    <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/90 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 sm:px-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
            Kurye paneli
          </p>
          <p className="font-semibold text-stone-950">
            {session.user.firstName} {session.user.lastName}
          </p>
        </div>
        <button
          className="min-h-11 rounded-full border border-stone-200 bg-white px-4 text-sm font-medium text-stone-900 shadow-sm"
          onClick={logout}
          type="button"
        >
          Çıkış
        </button>
      </div>
    </header>
  );
}
