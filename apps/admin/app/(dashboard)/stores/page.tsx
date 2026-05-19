import { requirePermission } from '../../../lib/auth/guards'; import { requireAdminSession } from '../../../lib/auth/session'; import { StoresManager } from '../../../components/catalog/stores-manager';
export default async function StoresPage(){const session=await requireAdminSession(); requirePermission(session,['settings.update']); return <StoresManager permissions={session.permissions}/>}
