import { DeliveryDetailPanel } from '../../../../components/deliveries/delivery-detail-panel';
export default async function DeliveryPage({params}:{params:Promise<{id:string}>}):Promise<React.JSX.Element>{const {id}=await params; return <DeliveryDetailPanel id={id}/>}
