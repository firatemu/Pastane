import { CourierShell } from '../../components/layout/courier-shell';
import { requireCourierRole } from '../../lib/auth/guards';
import { requireCourierSession } from '../../lib/auth/session';

export const dynamic = 'force-dynamic';

export default async function CourierLayout({children}:{children:React.ReactNode}):Promise<React.JSX.Element>{const session=await requireCourierSession(); requireCourierRole(session); return <CourierShell session={session}>{children}</CourierShell>}
