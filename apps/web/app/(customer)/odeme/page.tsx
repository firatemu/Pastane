import { Suspense } from 'react';
import { CheckoutForm } from '../../../components/checkout/checkout-form';
export default function CheckoutPage(): React.JSX.Element { return <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8"><Suspense fallback={<p className="rounded-2xl bg-white p-4">Ödeme sayfası yükleniyor…</p>}><CheckoutForm /></Suspense></main>; }
