import { statusLabel } from '../../lib/orders/status';
export function OrderStatusBadge({ status }: Readonly<{ status: string }>): React.JSX.Element {
  const tone = status === 'DELIVERED' ? 'bg-emerald-50 text-emerald-800' : status === 'CANCELLED' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-900';
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>{statusLabel(status)}</span>;
}
