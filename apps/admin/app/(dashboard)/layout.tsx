import { requireAdminSession } from '../../lib/auth/session';
import { AdminShell } from '../../components/layout/admin-shell';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>): Promise<React.JSX.Element> {
  const session = await requireAdminSession();
  return <AdminShell session={session}>{children}</AdminShell>;
}
