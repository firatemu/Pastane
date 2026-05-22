import { AllergensManager } from '../../../components/catalog/allergens-manager';
import { requirePermission } from '../../../lib/auth/guards';
import { requireAdminSession } from '../../../lib/auth/session';

export default async function AllergensPage(): Promise<React.JSX.Element> {
  const session = await requireAdminSession();
  requirePermission(session, ['allergens.view']);
  return <AllergensManager permissions={session.permissions} />;
}
