import type { DeliveryStatus } from '../../lib/deliveries/types';

const styles: Record<DeliveryStatus, string> = {
  ASSIGNED: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  PICKED_UP: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  OUT_FOR_DELIVERY: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  DELIVERED: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  FAILED: 'bg-red-50 text-red-700 ring-red-600/20',
};

const labels: Record<DeliveryStatus, string> = {
  ASSIGNED: 'Atandı',
  PICKED_UP: 'Teslim alındı',
  OUT_FOR_DELIVERY: 'Yolda',
  DELIVERED: 'Teslim edildi',
  FAILED: 'Başarısız',
};

const dots: Record<DeliveryStatus, string> = {
  ASSIGNED: 'bg-amber-500',
  PICKED_UP: 'bg-sky-500',
  OUT_FOR_DELIVERY: 'bg-blue-500',
  DELIVERED: 'bg-emerald-500',
  FAILED: 'bg-red-500',
};

export function DeliveryStatusBadge({ status }: { status: DeliveryStatus }): React.JSX.Element {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${styles[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dots[status]}`} />
      {labels[status]}
    </span>
  );
}