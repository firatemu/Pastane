import { StorefrontShell } from '../../components/layout/storefront-shell';
import { getCustomerSession } from '../../lib/auth/session';

export default async function StorefrontLayout({ children }: Readonly<{ children: React.ReactNode }>): Promise<React.JSX.Element> {
  const session = await getCustomerSession();
  return <StorefrontShell session={session ?? undefined}>{children}</StorefrontShell>;
}
