import { requirePermission } from '../../../lib/auth/guards';
import { requireAdminSession } from '../../../lib/auth/session';
import { CouriersManager } from '../../../components/operations/couriers-manager';

export default async function CouriersPage(): Promise<React.JSX.Element> {
  const session = await requireAdminSession();
  requirePermission(session, ['couriers.create', 'couriers.update']);
  return <CouriersManager permissions={session.permissions} />;
}
