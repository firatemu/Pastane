import { OrderDetailClient } from '../../../../components/orders/order-detail-client';
export default async function OrderDetailPage({ params }: Readonly<{ params: Promise<{ id: string }> }>): Promise<React.JSX.Element> {
  const { id } = await params;
  return <main className="stitch-container py-10 sm:py-12"><OrderDetailClient id={id} /></main>;
}
