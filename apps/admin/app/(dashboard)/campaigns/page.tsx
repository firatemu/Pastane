import { requirePermission } from '../../../lib/auth/guards';
import { requireAdminSession } from '../../../lib/auth/session';
import { CampaignsManager } from '../../../components/operations/campaigns-manager';

export default async function CampaignsPage(): Promise<React.JSX.Element> {
  const session = await requireAdminSession();
  requirePermission(session, ['campaigns.view']);
  return <CampaignsManager permissions={session.permissions} />;
}
