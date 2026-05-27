import { CustomersManager } from '../../../components/operations/customers-manager';
import { requirePermission } from '../../../lib/auth/guards';
import { requireAdminSession } from '../../../lib/auth/session';

export default async function CustomersPage(): Promise<React.JSX.Element> {
  const session = await requireAdminSession();
  requirePermission(session, ['customers.view']);

  return <CustomersManager permissions={session.permissions} />;
}
