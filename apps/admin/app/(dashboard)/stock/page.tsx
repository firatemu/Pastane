import { requirePermission } from '../../../lib/auth/guards'; import { requireAdminSession } from '../../../lib/auth/session'; import { StockManager } from '../../../components/catalog/stock-manager';
export default async function StockPage(){const session=await requireAdminSession(); requirePermission(session,['stock.view']); return <StockManager permissions={session.permissions}/>}
