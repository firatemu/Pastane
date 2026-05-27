import { LoginForm } from '../../../components/auth/login-form';
import { AdminBrand } from '../../../components/layout/admin-brand';

const OPERATIONS_PILLARS = [
  {
    icon: 'monitoring',
    title: 'Sipariş ve üretim görünürlüğü',
    description: 'Sipariş ve hazırlık akışlarını tek merkezden yönetin.',
  },
  {
    icon: 'verified_user',
    title: 'Güvenli ve denetlenebilir erişim',
    description: 'Yetki sınırları net, giriş akışı kurumsal ve sade.',
  },
] as const;

export default function LoginPage(): React.JSX.Element {
  return (
    <main className="relative min-h-screen overflow-hidden bg-canvas px-2.5 py-2.5 sm:px-3 sm:py-3 lg:px-4 lg:py-4">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-5rem] top-[-5rem] h-44 w-44 rounded-full bg-secondary/15 blur-3xl sm:h-60 sm:w-60" />
        <div className="absolute bottom-[-6rem] right-[-3rem] h-52 w-52 rounded-full bg-tertiary/16 blur-3xl sm:h-72 sm:w-72" />
        <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.92),transparent_68%)]" />
      </div>

      <div className="relative mx-auto grid w-full max-w-[1180px] overflow-hidden rounded-[1.5rem] border border-outline-variant/60 bg-surface-container-lowest shadow-[0_18px_56px_rgba(17,24,39,0.12)] lg:h-[calc(100vh-2rem)] lg:max-h-[900px] lg:grid-cols-[minmax(0,1fr)_minmax(360px,410px)]">
        <section className="relative overflow-hidden bg-[linear-gradient(165deg,#253446_0%,#33465f_56%,#5c6a85_100%)] text-on-secondary">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_0_36%),radial-gradient(circle_at_bottom_right,rgba(219,231,244,0.16),transparent_0_32%)]" />

          <div className="relative flex h-full flex-col justify-between px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-5 xl:px-7 xl:py-6">
            <div>
              <div className="inline-flex rounded-[1.1rem] border border-white/12 bg-white/10 px-3 py-2 backdrop-blur">
                <AdminBrand
                  eyebrow="Azem Yazılım"
                  priority
                  size="md"
                  subtitle="Kurumsal operasyon konsolu"
                  title="Pastane Admin"
                  tone="inverse"
                />
              </div>

              <div className="mt-5 max-w-lg sm:mt-6 lg:mt-7">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex rounded-full border border-white/12 bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/75">
                    Güvenli erişim
                  </span>
                  <span className="inline-flex rounded-full border border-white/12 bg-white/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/65 lg:hidden xl:inline-flex">
                    Denetim kayıtları açık
                  </span>
                </div>
                <h1 className="mt-3 text-[1.55rem] font-semibold tracking-tight text-white sm:text-[1.85rem] xl:text-[2.1rem]">
                  Hızlı ve güvenli admin girişi.
                </h1>
                <p className="mt-2 max-w-md text-[13px] leading-5 text-white/72 sm:text-sm sm:leading-6">
                  Sipariş, mağaza ve yönetim süreçlerine sadeleştirilmiş kurumsal erişim.
                </p>
              </div>
            </div>

            <div className="relative mt-5 space-y-2.5 sm:mt-6 lg:mt-6">
              <div className="grid gap-2.5 sm:grid-cols-2">
                {OPERATIONS_PILLARS.map((pillar) => (
                  <article
                    key={pillar.title}
                    className="rounded-[1.1rem] border border-white/10 bg-white/8 px-3.5 py-3 backdrop-blur-sm"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="material-symbols-outlined flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-white/14 text-[18px] text-white">
                        {pillar.icon}
                      </span>
                      <div className="min-w-0">
                        <h2 className="text-[13px] font-semibold tracking-tight text-white">{pillar.title}</h2>
                        <p className="mt-1 text-[12px] leading-5 text-white/68">{pillar.description}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="rounded-[1.1rem] border border-white/12 bg-white/8 px-3.5 py-3 backdrop-blur-sm lg:py-2.5">
                <p className="text-[12px] leading-5 text-white/72">
                  Erişim yalnızca yetkili hesaplar içindir. Sorun yaşarsanız sistem yöneticinizle iletişime geçin.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center border-t border-outline-variant/50 bg-surface-container-lowest px-3 py-3 sm:px-4 sm:py-4 lg:border-l lg:border-t-0 lg:px-5 lg:py-4 xl:px-6">
          <div className="w-full max-w-sm">
            <div className="mb-3 lg:hidden">
              <div className="inline-flex rounded-[1.05rem] border border-outline-variant/70 bg-surface-container-low px-3 py-2 text-on-surface shadow-sm">
                <AdminBrand size="sm" subtitle="Operasyon paneli girişi" title="Pastane Admin" />
              </div>
            </div>

            <div className="rounded-[1.3rem] border border-outline-variant/70 bg-white/92 p-4 shadow-[0_14px_36px_rgba(22,32,51,0.08)] backdrop-blur sm:p-5">
              <div className="flex flex-col gap-3 border-b border-outline-variant/55 pb-4">
                <div className="flex items-start justify-between gap-2.5">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-secondary">Kurumsal giriş</p>
                    <h2 className="mt-1.5 text-[1.45rem] font-semibold tracking-tight text-on-surface sm:text-[1.65rem]">Hesabınızla oturum açın</h2>
                  </div>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-on-secondary">
                    <span className="material-symbols-outlined text-[18px]">shield_lock</span>
                  </div>
                </div>
                <p className="max-w-sm text-[13px] leading-5 text-on-surface-variant sm:text-sm sm:leading-6">
                  Yetkili telefon numaranız ve parolanızla yönetim paneline erişin.
                </p>
              </div>

              <LoginForm />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
