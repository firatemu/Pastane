export function StorefrontFooter(): React.JSX.Element {
  return (
    <footer className="border-t border-outline-soft/30 bg-primary text-white">
      <div className="stitch-container grid gap-10 py-12 md:grid-cols-[1.3fr_0.7fr_0.7fr]">
        <div>
          <p className="font-display text-3xl font-bold">Pasta-Hane</p>
          <p className="mt-4 max-w-md text-sm leading-6 text-white/75">
            Botanical aromalar, koyu kakao ve günlük üretim ritmiyle tasarlanmış dijital pastane deneyimi.
          </p>
        </div>
        <div className="grid gap-2 text-sm text-white/75">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">Koleksiyonlar</p>
          <a className="hover:text-white" href="/kategori/pastalar">Pastalar</a>
          <a className="hover:text-white" href="/kategori/tatlilar">Tatlılar</a>
          <a className="hover:text-white" href="/kategori/unlu-mamuller">Unlu Mamuller</a>
        </div>
        <div className="grid gap-2 text-sm text-white/75">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">Hesap</p>
          <a className="hover:text-white" href="/sepet">Sepet</a>
          <a className="hover:text-white" href="/siparisler">Siparişler</a>
          <a className="hover:text-white" href="/hesabim">Hesabım</a>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="stitch-container flex flex-col gap-2 py-5 text-xs uppercase tracking-[0.14em] text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>Pastane Platform</p>
          <p>Europe/Istanbul</p>
        </div>
      </div>
    </footer>
  );
}
