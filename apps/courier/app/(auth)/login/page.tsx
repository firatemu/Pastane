import { CourierLoginForm } from '../../../components/auth/courier-login-form';

export default function LoginPage(): React.JSX.Element {
  return (
    <main className="flex min-h-screen bg-stone-50">
      {/* Sol Panel — Marka Alanı */}
      <section className="relative hidden w-1/2 items-center justify-center overflow-hidden bg-gradient-to-br from-amber-600 via-amber-700 to-stone-900 lg:flex">
        {/* Dekoratif arka plan deseni */}
        <div className="absolute inset-0 opacity-[0.07]">
          <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
                <path d="M 48 0 L 0 0 0 48" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Dekoratif daireler */}
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-amber-500/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-white/10 blur-2xl" />

        <div className="relative z-10 max-w-md px-12 text-white">
          {/* Logo / İkon */}
          <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
            <svg
              className="h-8 w-8 text-white"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.8}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25m-3.75 0V5.625m0 12.75v-2.25m0-5.625v2.25m0-2.25H5.625c-.621 0-1.125.504-1.125 1.125v5.25c0 .621.504 1.125 1.125 1.125m5.625-7.5h3.75m-3.75 0V5.625m0 0A2.625 2.625 0 0 1 13.875 3h.375a2.625 2.625 0 0 1 2.625 2.625V5.625m0 0h1.5"
              />
            </svg>
          </div>

          <h1 className="text-4xl font-bold leading-tight tracking-tight">
            Pastane
            <span className="mt-1 block text-lg font-normal tracking-normal text-amber-200/80">
              Kurye Teslimat Paneli
            </span>
          </h1>

          <p className="mt-6 text-base leading-relaxed text-amber-100/70">
            Atanan teslimatlarınızı yönetin, paketlerinizi teslim edin ve teslimat geçmişinizi takip edin.
          </p>

          {/* Özellik kartları */}
          <div className="mt-10 space-y-4">
            {[
              {
                icon: (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z"
                  />
                ),
                text: 'Rota ve adres takibi',
              },
              {
                icon: (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                  />
                ),
                text: 'Anlık teslimat durumu güncelleme',
              },
              {
                icon: (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z"
                  />
                ),
                text: 'Teslimat geçmişi ve raporlama',
              },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <svg className="h-4.5 w-4.5 text-amber-200" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                    {item.icon}
                  </svg>
                </div>
                <span className="text-sm text-amber-100/80">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sağ Panel — Form Alanı */}
      <section className="flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2 lg:px-16">
        <div className="w-full max-w-[420px]">
          {/* Mobil logo */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-600 text-white">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25m-3.75 0V5.625m0 12.75v-2.25m0-5.625v2.25m0-2.25H5.625c-.621 0-1.125.504-1.125 1.125v5.25c0 .621.504 1.125 1.125 1.125m5.625-7.5h3.75m-3.75 0V5.625m0 0A2.625 2.625 0 0 1 13.875 3h.375a2.625 2.625 0 0 1 2.625 2.625V5.625m0 0h1.5"
                />
              </svg>
            </div>
            <div>
              <span className="text-lg font-bold text-stone-900">Pastane</span>
              <span className="block text-xs text-stone-500">Kurye Paneli</span>
            </div>
          </div>

          {/* Başlık */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold tracking-tight text-stone-900">Giriş Yap</h2>
            <p className="mt-2 text-sm text-stone-500">
              Teslimat panelinize erişmek için kurye bilgilerinizi girin.
            </p>
          </div>

          {/* Form */}
          <CourierLoginForm />

          {/* Alt bilgi */}
          <div className="mt-8 border-t border-stone-200 pt-6">
            <p className="text-center text-xs leading-relaxed text-stone-400">
              Bu panel yalnızca yetkili kurye hesapları için erişilebilir.{' '}
              <br className="hidden sm:inline" />
              Hesap sorunları için operatörünüzle iletişime geçin.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}