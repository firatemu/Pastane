import { requirePermission } from '../../../lib/auth/guards';
import { requireAdminSession } from '../../../lib/auth/session';
import { AuditLogManager } from '../../../components/operations/audit-log-manager';

export default async function AuditPage(): Promise<React.JSX.Element> {
  const session = await requireAdminSession();
  requirePermission(session, ['audit.view']);
  return <AuditLogManager />;
}
