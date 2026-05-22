## Admin Panel Tasarım Notları (localhost:3001)

Bu doküman **yalnızca** `http://localhost:3001/` (Pastane Admin paneli) sayfaları için geçerlidir. Web / courier / mobile için kullanılmaz.

Amaç: Operasyon odaklı, güvenli, okunaklı, “Stitch / Digital Bakery” hissi veren; yoğun bilgi taşıyabilen ama temiz bir UI dili.

---

## Tema / Tokenlar (Tailwind)

Kaynak: `apps/admin/tailwind.config.ts`

- **Zemin**: `bg-canvas` (krem) ve yüzeyler: `bg-surface-container-lowest`, `bg-surface-container-low`, `bg-surface-container`, `bg-surface-variant`
- **Metin**: `text-on-surface`, ikincil metin `text-on-surface-variant`, silik `text-outline`
- **Vurgu**: `text-secondary`, `bg-secondary-container`, “çikolata” aksanı `bg-chocolate`
- **Hata**: `text-error`, `bg-error-container`
- **Radius**: `rounded-card` (1.5rem) ve küçük yüzeylerde `rounded-xl` / `rounded-2xl`
- **Gölge**: `shadow-bakery` (yumuşak)
- **Spacing**: `gap-gutter`, `py-stack-lg`, `px-margin-desktop`, `max-w-container-max`
- **Tipografi**: gövde `font-sans` (Jakarta), başlık `font-display` (Playfair)

---

## Sayfa İskeleti (Layout)

Kaynak: `apps/admin/components/layout/admin-shell.tsx`

- **Genel**: `min-h-screen bg-canvas`
- **Container**: `mx-auto w-full max-w-container-max px-4 sm:px-6 lg:px-margin-desktop`
- **Header/Footer**: açık yüzey + ince border (`border-outline-variant`)
- **Sidebar + Topbar**: sabit, operasyon odaklı navigasyon; ikonlar Google Material Symbols.

---

## Başlık / Açıklama Stili

- **Sayfa başlığı**: `font-display text-3xl font-semibold tracking-tight text-on-surface`
- **Açıklama**: `mt-2 text-[15px] leading-relaxed text-on-surface-variant` (maks. ~2 satır ideali)

---

## Kartlar / Bölümler

### Kart kabuğu (standart)

Çoğu panel/bölüm şu kabuğu kullanır:

- `rounded-card border border-outline-variant/35 bg-surface-container-lowest shadow-bakery`
- İç padding genelde `p-6`, yoğun araç çubuğunda `p-4`

### İstatistik “chip-card” (minimal)

`BakeryStatCard size="minimal"`: **tek satır**, küçük, halo yok, subtitle yok.

Kullanım: ürünler sayfasındaki 4 KPI (Toplam/Satışta/Stokta yok/İndirimli).

---

## Tablolar / Listeler

- **Başlık satırı**: uppercase, küçük puntolu; admin yoğun bilgi için.
- **Kolon isimleri**: ortalanmış (`text-center`) istenirse.
- **Satır hover**: `hover:bg-surface-variant/35`
- **Seçili satır**: `bg-secondary-container/25`
- **Aksiyon kolonu**: mümkünse tek ikon (örn. edit). “Detay” butonu/chevron gibi tekrar eden öğeler azaltılır.

Not: Grid görünümü gerekiyorsa (kategorilerde) “card grid” alternatifi sunulur.

---

## Filtre / Arama Araç Çubuğu

Kalıp: tek “toolbar card”.

- Kabuğu: `rounded-card border ... bg-surface-container-lowest p-4 shadow-bakery`
- Inputlarda ortak sınıflar: `apps/admin/components/shared/admin-form-controls.tsx`
  - `adminInputClass`, `adminSelectClass`, `adminTextareaClass`
  - Butonlar: `adminPrimaryButtonClass`, `adminSecondaryButtonClass`
- Arama alanında sol ikon: `material-symbols-outlined` + `pl-10`

---

## Formlar

### Genel prensip

- Admin’de form alanları **net**, hatalar **kırmızı** ve yakın.
- Çoklu seçimlerde (alerjen) **chip toggle** (buton tag) tercih edilir.
- `<Field />` bileşeni label + hata metnini standardize eder.

### Form sunumları

- **Edit/Create**: sağdan açılan **sheet/drawer** (örn. ürün ve kategori).
- Form drawer arka planı: `bg-chocolate/25` + blur.
- Drawer z-index: popup üstüne gelebilecek şekilde yüksek (`z-[70]` civarı).

---

## Popup / Modal Davranışı (İnceleme Modu)

Ürün listesinde satıra tıklayınca açılan ekran:

- **Salt okunur** “inceleme modu” olmalı.
- İnceleme modalı:
  - arka plan overlay (`bg-chocolate/30` + blur)
  - `Esc` ile kapat
  - body scroll lock
  - içerik scroll: modal içinde `overflow-y-auto`
- Modal içinde **düzenleme yapılmaz**. “Düzenle” ikonu/butonu kalır; tıklanınca modal kapanır ve **edit drawer** açılır.

---

## Ürün Yönetimi Sözleşmesi (Products)

- Liste + filtre + istatistik chip’leri: `ProductsManager`
- Detay (inceleme): `ProductDetailModal` + `ProductDetailTabs (readOnly)`
- Düzenleme: `ProductFormSheet` (sheet)
  - Edit modunda sekmeler: Bilgiler / Görseller / Opsiyonlar / Stok
  - Medya yükleme düzeni: “Yükle” butonu **alt satırda full width**; dar panelde kayma olmaz.

Slug bilgisi UI’da gösterilmez (kaldırıldı).

---

## Async Durumları

Kaynak: `apps/admin/components/shared/async-state.tsx`

- Loading: beyaz/surface kart içinde kısa metin
- Error: kırmızı container (`bg-red-50` vs) — mümkünse gelecekte token’larla uyumlanabilir

---

## Tasarım Kuralları (Vibe Coding için “değişmezler”)

- **Admin’e özel**: sadece `apps/admin` ve `localhost:3001`
- **Renk dili**: token isimleri (canvas/surface/outline/secondary/tertiary/chocolate) ile; rastgele hex kullanma.
- **Yoğun bilgi, düşük sürtünme**: gereksiz buton/ikon/chevron azalt.
- **İnceleme ≠ düzenleme**: listeden açılan modal her zaman read-only; güncelleme drawer’dan yapılır.
- **Tekrarlı UI parçaları**: input/buton class’larını `admin-form-controls.tsx` üzerinden kullan.
- **Material Symbols**: ikonlar bu setten; boyutlar `text-[18..24px]`.

