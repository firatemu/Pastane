import type { CourierSession } from '../../lib/auth/types';
import { CourierTopbar } from './courier-topbar';
import { MinimalNav } from './minimal-nav';
export function CourierShell({children,session}:{children:React.ReactNode;session:CourierSession}):React.JSX.Element{return <div className="min-h-screen bg-amber-50"><CourierTopbar session={session}/><MinimalNav/><main className="mx-auto max-w-md px-4 pb-8">{children}</main></div>}
