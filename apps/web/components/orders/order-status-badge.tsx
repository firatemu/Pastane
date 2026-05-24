import { orderStatusBadgeClass, statusLabel } from '../../lib/orders/status';

export function OrderStatusBadge({ status }: Readonly<{ status: string }>): React.JSX.Element {
  return <span className={orderStatusBadgeClass(status)}>{statusLabel(status)}</span>;
}
