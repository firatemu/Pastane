import type { CustomerSession } from '../../lib/auth/types';
import type { Product } from '../../lib/catalog/types';
import { StorefrontFooter } from './storefront-footer';
import { StorefrontHeader } from './storefront-header';

export function StorefrontShell({
  children,
  searchProducts,
  session,
}: Readonly<{
  children: React.ReactNode;
  searchProducts?: Product[];
  session?: CustomerSession | undefined;
}>): React.JSX.Element {
  return (
    <div className="min-h-screen bg-background pt-[88px] text-ink">
      <StorefrontHeader searchProducts={searchProducts ?? []} session={session} />
      {children}
      <StorefrontFooter />
    </div>
  );
}
