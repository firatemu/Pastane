import { ProductUnitsManager } from '../../../components/catalog/product-units-manager';
import { requirePermission } from '../../../lib/auth/guards';
import { requireAdminSession } from '../../../lib/auth/session';

export default async function ProductUnitsPage(): Promise<React.JSX.Element> {
  const session = await requireAdminSession();
  requirePermission(session, ['productUnits.view']);
  return <ProductUnitsManager permissions={session.permissions} />;
}
