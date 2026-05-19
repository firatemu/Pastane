import type { CustomerSession } from '../../lib/auth/types';
import { StorefrontFooter } from './storefront-footer';
import { StorefrontHeader } from './storefront-header';

export function StorefrontShell({ children, session }: Readonly<{ children: React.ReactNode; session?: CustomerSession }>): React.JSX.Element {
  return (
    <div className="min-h-screen bg-[#fffaf3]">
      {session ? <StorefrontHeader session={session} /> : <StorefrontHeader />}
      {children}
      <StorefrontFooter />
    </div>
  );
}
