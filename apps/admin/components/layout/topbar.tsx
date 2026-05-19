'use client';

import { useRouter } from 'next/navigation';
import type { AdminSession } from '../../lib/auth/types';

export function Topbar({ session }: Readonly<{ session: AdminSession }>): React.JSX.Element {
  const router = useRouter();
  async function logout(): Promise<void> {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }
  return (
    <header className="flex flex-col gap-3 border-b bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
      <div>
        <p className="text-sm text-stone-500">Europe/Istanbul</p>
        <p className="font-medium">{session.user.firstName} {session.user.lastName}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">{session.user.role.name}</span>
        <button className="rounded-full border px-4 py-2 text-sm font-medium transition hover:bg-stone-50" onClick={logout} type="button">Çıkış</button>
      </div>
    </header>
  );
}
