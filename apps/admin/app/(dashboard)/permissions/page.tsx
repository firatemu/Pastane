import { PermissionsDirectory } from '../../../components/operations/permissions-directory';
import { requirePermission } from '../../../lib/auth/guards';
import { requireAdminSession } from '../../../lib/auth/session';

export default async function PermissionsPage(): Promise<React.JSX.Element> {
  const session = await requireAdminSession();
  requirePermission(session, ['permissions.view']);
  return <PermissionsDirectory />;
}
