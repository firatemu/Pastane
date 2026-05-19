import { requirePermission } from '../../../lib/auth/guards';
import { requireAdminSession } from '../../../lib/auth/session';
import { UsersManager } from '../../../components/operations/users-manager';

export default async function UsersPage(): Promise<React.JSX.Element> {
  const session = await requireAdminSession();
  requirePermission(session, ['users.view']);
  return <UsersManager permissions={session.permissions} />;
}
