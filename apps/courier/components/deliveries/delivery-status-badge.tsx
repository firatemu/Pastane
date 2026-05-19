import type { DeliveryStatus } from '../../lib/deliveries/types';
const styles:Record<DeliveryStatus,string>={ASSIGNED:'bg-amber-100 text-amber-900',PICKED_UP:'bg-sky-100 text-sky-900',OUT_FOR_DELIVERY:'bg-blue-100 text-blue-900',DELIVERED:'bg-green-100 text-green-900',FAILED:'bg-red-100 text-red-900'};
const labels:Record<DeliveryStatus,string>={ASSIGNED:'Atandı',PICKED_UP:'Teslim alındı',OUT_FOR_DELIVERY:'Yolda',DELIVERED:'Teslim edildi',FAILED:'Başarısız'};
export function DeliveryStatusBadge({status}:{status:DeliveryStatus}):React.JSX.Element{return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${styles[status]}`}>{labels[status]}</span>}
