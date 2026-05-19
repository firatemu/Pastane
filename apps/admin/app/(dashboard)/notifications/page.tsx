import { requirePermission } from '../../../lib/auth/guards';
import { requireAdminSession } from '../../../lib/auth/session';
import { NotificationsSendManager } from '../../../components/operations/notifications-send-manager';

export default async function NotificationsPage(): Promise<React.JSX.Element> {
  const session = await requireAdminSession();
  requirePermission(session, ['notifications.send']);
  return <NotificationsSendManager />;
}
