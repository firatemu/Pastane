'use client';

import { useRouter } from 'next/navigation';

/** Shared sign-out action for the compact admin chrome. */
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
      ? 'flex items-center gap-2 rounded-xl border border-sidebar-border bg-sidebar-highlight px-3 py-2 text-[13px] font-semibold text-sidebar-foreground transition hover:border-secondary/25 hover:bg-secondary-container active:scale-[0.98]'
      : 'rounded-xl border border-outline-variant/80 bg-surface-container-lowest px-3 py-2 text-[13px] font-medium text-on-surface shadow-sm transition hover:bg-surface-container-low';
  return (
    <button className={[base, className ?? ''].join(' ')} onClick={() => void logout()} type="button">
      {children ?? 'Çıkış'}
    </button>
  );
}
