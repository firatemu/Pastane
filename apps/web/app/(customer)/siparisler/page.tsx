import { OrderHistoryClient } from '../../../components/orders/order-history-client';
export default function OrdersPage(): React.JSX.Element {
  return <main className="stitch-container py-12"><div className="mb-10"><p className="stitch-eyebrow">Siparişlerim</p><h1 className="stitch-title mt-3">Geçmiş ve aktif siparişler</h1></div><OrderHistoryClient /></main>;
}
