import { StorefrontShell } from '../../components/layout/storefront-shell';
import { requireCustomerRole } from '../../lib/auth/guards';
import { requireCustomerSession } from '../../lib/auth/session';

export default async function CustomerLayout({ children }: Readonly<{ children: React.ReactNode }>): Promise<React.JSX.Element> {
  const session = await requireCustomerSession();
  requireCustomerRole(session);
  return <StorefrontShell session={session}>{children}</StorefrontShell>;
}
