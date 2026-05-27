import { RolesDirectory } from '../../../components/operations/roles-directory';
import { requirePermission } from '../../../lib/auth/guards';
import { requireAdminSession } from '../../../lib/auth/session';

export default async function RolesPage(): Promise<React.JSX.Element> {
  const session = await requireAdminSession();
  requirePermission(session, ['roles.view']);
  const canManage = session.permissions.includes('permissions.manage');
  return <RolesDirectory canManage={canManage} />;
}
