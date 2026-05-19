import { requirePermission } from '../../../lib/auth/guards';
import { requireAdminSession } from '../../../lib/auth/session';
import { BannersManager } from '../../../components/banners/banners-manager';

export default async function BannersPage(): Promise<React.JSX.Element> {
  const session = await requireAdminSession();
  requirePermission(session, ['banners.view']);
  return <BannersManager permissions={session.permissions} />;
}
