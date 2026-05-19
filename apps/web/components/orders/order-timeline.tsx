import { CUSTOMER_TIMELINE, statusLabel } from '../../lib/orders/status';
import type { Order } from '../../lib/orders/types';

export function OrderTimeline({ status, history = [] }: Readonly<{ status: string; history?: Order['statusHistory'] }>): React.JSX.Element {
  const current = CUSTOMER_TIMELINE.indexOf(status as never);
  const cancelled = status === 'CANCELLED';
  const latestByStatus = new Map((history ?? []).map((item) => [item.status, item]));
  return <ol className="space-y-3">{CUSTOMER_TIMELINE.map((step, index) => { const done = !cancelled && current >= index; const event = latestByStatus.get(step); return <li className="flex gap-3" key={step}><span className={`mt-1 h-4 w-4 rounded-full border ${done ? 'border-emerald-600 bg-emerald-500' : 'border-stone-300 bg-white'}`} /><span className={done ? 'font-medium text-stone-950' : 'text-stone-500'}>{statusLabel(step)}{event ? <span className="mt-0.5 block text-xs font-normal text-stone-500">{new Date(event.createdAt).toLocaleString('tr-TR')}{event.note ? ` · ${event.note}` : ''}</span> : null}</span></li>; })}{cancelled ? <li className="flex gap-3"><span className="mt-1 h-4 w-4 rounded-full bg-red-500" /><span className="font-medium text-red-800">Sipariş iptal edildi</span></li> : null}</ol>;
}