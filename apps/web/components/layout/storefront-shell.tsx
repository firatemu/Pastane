import type { CustomerSession } from '../../lib/auth/types';
import type { Category } from '../../lib/catalog/types';
import { StorefrontFooter } from './storefront-footer';
import { StorefrontHeader } from './storefront-header';

export function StorefrontShell({
  categories = [],
  children,
  session,
}: Readonly<{
  categories?: Category[];
  children: React.ReactNode;
  session?: CustomerSession | undefined;
}>): React.JSX.Element {
  return (
    <div className="min-h-screen bg-background pt-[88px] text-ink">
      <StorefrontHeader categories={categories} session={session} />
      {children}
      <StorefrontFooter />
    </div>
  );
}
