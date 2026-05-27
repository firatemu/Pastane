import { StorefrontShell } from '../../components/layout/storefront-shell';
import { requireCustomerRole } from '../../lib/auth/guards';
import { requireCustomerSession } from '../../lib/auth/session';
import { getProducts } from '../../lib/catalog/queries';

export default async function CustomerLayout({ children }: Readonly<{ children: React.ReactNode }>): Promise<React.JSX.Element> {
  const [session, products] = await Promise.all([
    requireCustomerSession(),
    getProducts({ page: 1, limit: 100 }),
  ]);
  requireCustomerRole(session);
  return <StorefrontShell searchProducts={products.items} session={session}>{children}</StorefrontShell>;
}
