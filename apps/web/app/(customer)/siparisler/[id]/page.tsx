import { OrderDetailClient } from '../../../../components/orders/order-detail-client';
export default async function OrderDetailPage({ params }: Readonly<{ params: Promise<{ id: string }> }>): Promise<React.JSX.Element> { const { id } = await params; return <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8"><OrderDetailClient id={id} /></main>; }
