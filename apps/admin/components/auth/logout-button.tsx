'use client';

import { useRouter } from 'next/navigation';

/** Shared sign-out triggered from toolbar or sidebar (Stitch-inspired admin chrome). */
export function LogoutButton({
  variant = 'subtle',
  className,
  children,
}: Readonly<{ variant?: 'subtle' | 'danger'; className?: string; children?: React.ReactNode }>): React.JSX.Element {
  const router = useRouter();
  async function logout(): Promise<void> {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }
  const base =
    variant === 'danger'
      ? 'flex items-center gap-2 rounded-xl px-4 py-3 text-base font-semibold text-error transition hover:bg-error-container/50 active:scale-[0.98]'
      : 'rounded-full border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface hover:bg-surface-variant/40';
  return (
    <button className={[base, className ?? ''].join(' ')} onClick={() => void logout()} type="button">
      {children ?? 'Çıkış'}
    </button>
  );
}
