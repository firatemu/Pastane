import type { CustomerSession } from '../../lib/auth/types';
import { StorefrontFooter } from './storefront-footer';
import { StorefrontHeader } from './storefront-header';

export function StorefrontShell({
  children,
  session,
}: Readonly<{
  children: React.ReactNode;
  session?: CustomerSession | undefined;
}>): React.JSX.Element {
  return (
    <div className="min-h-screen bg-background pt-[88px] text-ink">
      <StorefrontHeader session={session} />
      {children}
      <StorefrontFooter />
    </div>
  );
}
