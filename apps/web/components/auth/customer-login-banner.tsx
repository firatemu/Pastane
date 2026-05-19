'use client';

import { useSearchParams } from 'next/navigation';

const REASON_MESSAGES: Record<string, string> = {
  oturum: 'Oturumunuz sona erdi veya giriş yapmadınız. Lütfen tekrar giriş yapın.',
};

export function CustomerLoginBanner(): React.JSX.Element | null {
  const searchParams = useSearchParams();
  const reason = searchParams.get('neden');
  const text = reason ? REASON_MESSAGES[reason] : null;
  if (!text) return null;
  return (
    <p className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950" role="status">
      {text}
    </p>
  );
}
