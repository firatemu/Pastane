export function StorefrontFooter(): React.JSX.Element {
  return (
    <footer className="border-t border-outline-soft/30 bg-[#18241b] text-white">
      <div className="stitch-container grid gap-10 py-12 md:grid-cols-[1.3fr_0.8fr_0.8fr_0.9fr]">
        <div>
          <p className="font-display text-3xl font-bold">Pasta-Hane</p>
          <p className="mt-4 max-w-md text-sm leading-6 text-white/75">
            Günlük üretim pastalar, sütlü tatlılar, dondurma, kurabiye ve fırın ürünleriyle sıcak, hızlı ve premium pastane deneyimi.
          </p>
          <a className="mt-6 inline-flex rounded-full bg-honey px-5 py-3 text-sm font-extrabold uppercase tracking-[0.12em] text-primary hover:bg-gold" href="/shop">Siparişe başla</a>
        </div>
        <div className="grid gap-2 text-sm text-white/75">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">Hızlı Erişim</p>
          <a className="hover:text-white" href="/shop">Vitrin</a>
          <p>Hakkımızda</p>
          <p>İletişim</p>
          <p>Gizlilik Sözleşmesi</p>
          <p>Kişisel Verilerin Korunması</p>
        </div>
        <div className="grid gap-2 text-sm text-white/75">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">Hesap</p>
          <a className="hover:text-white" href="/sepet">Sepet</a>
          <a className="hover:text-white" href="/siparisler">Siparişler</a>
          <a className="hover:text-white" href="/hesabim">Hesabım</a>
        </div>
        <div className="grid gap-2 text-sm text-white/75">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">Teslimat</p>
          <p>Her gün 09:00 - 22:00</p>
          <p>Soğuk ürünlerde korumalı paketleme</p>
          <p>Adres ve teslimat bilgileri ödeme adımında doğrulanır.</p>
          <div className="mt-2 flex gap-2">
            <span className="rounded-full border border-white/15 px-3 py-1 text-xs font-bold">Instagram</span>
            <span className="rounded-full border border-white/15 px-3 py-1 text-xs font-bold">WhatsApp</span>
          </div>
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
