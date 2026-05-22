import { CartPageClient } from '../../../components/cart/cart-page-client';
export default function CartPage(): React.JSX.Element {
  return (
    <main className="stitch-container py-12">
      <div className="mb-10">
        <p className="stitch-eyebrow">Seçiminiz</p>
        <h1 className="stitch-title mt-3 text-xl sm:text-2xl md:text-[1.875rem]">Sepetim</h1>
      </div>
      <CartPageClient />
    </main>
  );
}
