import { requirePermission } from '../../../lib/auth/guards';
import { requireAdminSession } from '../../../lib/auth/session';
import { SettingsManager } from '../../../components/operations/settings-manager';

export default async function SettingsPage(): Promise<React.JSX.Element> {
  const session = await requireAdminSession();
  requirePermission(session, ['settings.view']);
  return <SettingsManager permissions={session.permissions} />;
}
