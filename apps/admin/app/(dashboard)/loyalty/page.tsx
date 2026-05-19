import { requirePermission } from '../../../lib/auth/guards';
import { requireAdminSession } from '../../../lib/auth/session';
import { LoyaltyAdminManager } from '../../../components/operations/loyalty-admin-manager';

export default async function LoyaltyPage(): Promise<React.JSX.Element> {
  const session = await requireAdminSession();
  requirePermission(session, ['loyalty.manageSettings']);
  return <LoyaltyAdminManager permissions={session.permissions} />;
}
