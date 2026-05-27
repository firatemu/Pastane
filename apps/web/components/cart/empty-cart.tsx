import { stitchImages } from '../../lib/stitch-design';

export function EmptyCart(): React.JSX.Element {
  return (
    <div className="stitch-panel overflow-hidden rounded-3xl">
      <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="relative min-h-72">
          <img alt="Taze pasta vitrini" className="absolute inset-0 h-full w-full object-cover" src={stitchImages.cake} />
          <div className="absolute inset-0 bg-primary/25" />
        </div>
        <div className="flex flex-col justify-center p-8 sm:p-12">
          <p className="stitch-eyebrow">Sepetim</p>
          <h2 className="mt-3 font-display text-4xl font-bold text-primary">Sepetiniz henüz boş</h2>
          <p className="mt-4 max-w-md text-base leading-7 text-muted">Pastalar, tatlılar, dondurma ve fırından çıkan taze ürünler vitrinde sizi bekliyor.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a className="stitch-button" href="/shop">Vitrine git</a>
            <a className="rounded-full border border-outline-soft/70 px-6 py-3 text-sm font-bold uppercase tracking-[0.12em] text-primary hover:border-primary" href="/">Ana sayfa</a>
          </div>
        </div>
      </div>
    </div>
  );
}
