import { STATUS_LABELS,STATUS_TONES } from '../../lib/operations/status'; import type { OrderStatus } from '../../lib/operations/types';
export function StatusBadge({status}:{status:OrderStatus}){return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_TONES[status]}`}>{STATUS_LABELS[status]}</span>}
