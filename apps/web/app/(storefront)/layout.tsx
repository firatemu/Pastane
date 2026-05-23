import { StorefrontShell } from '../../components/layout/storefront-shell';
import { getCustomerSession } from '../../lib/auth/session';
import { categoriesHavingProducts, getCategories, getProducts } from '../../lib/catalog/queries';

export default async function StorefrontLayout({ children }: Readonly<{ children: React.ReactNode }>): Promise<React.JSX.Element> {
  const [session, categories, products] = await Promise.all([
    getCustomerSession(),
    getCategories(),
    getProducts({ page: 1, limit: 100 }),
  ]);
  const menuCategories = categoriesHavingProducts(categories, products.items);
  return (
    <StorefrontShell categories={menuCategories} session={session ?? undefined}>
      {children}
    </StorefrontShell>
  );
}
