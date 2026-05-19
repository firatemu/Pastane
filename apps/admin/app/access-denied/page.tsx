import Link from 'next/link';

export default function AccessDeniedPage(): React.JSX.Element {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <section className="max-w-lg rounded-3xl border bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-red-700">Erişim reddedildi</p>
        <h1 className="mt-3 text-3xl font-semibold">Bu alan için yetkiniz yok</h1>
        <p className="mt-3 text-sm leading-6 text-stone-600">Yönetim paneli yalnızca yetkili operasyon rolleri içindir.</p>
        <p className="mt-4 text-sm leading-6 text-stone-600">
          Yeni izinler verildiyse veya veritabanı güncellendiyse mevcut oturumunuzda eski yetkiler olabilir. Önce{' '}
          <strong>Çıkış</strong> yapıp tekrar giriş deneyin; gerekiyorsa tam yetkili <strong>Sistem yöneticisi</strong> hesabı
          kullanın.
        </p>
        <p className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link className="rounded-2xl border border-stone-900 px-4 py-2 text-sm font-medium text-stone-900" href="/dashboard">
            Panele dön
          </Link>
          <Link className="rounded-2xl bg-stone-900 px-4 py-2 text-sm font-medium text-white" href="/login">
            Girişe dön
          </Link>
        </p>
      </section>
    </main>
  );
}
