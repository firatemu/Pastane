import { can } from '../../lib/permissions/can';

export function PermissionGate({ children, permissions, required }: Readonly<{ children: React.ReactNode; permissions: string[]; required: string[] }>): React.JSX.Element | null {
  return can(permissions, required) ? <>{children}</> : null;
}
