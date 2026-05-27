import { Suspense } from 'react';
import { CustomerLoginBanner } from '../../../components/auth/customer-login-banner';
import { CustomerLoginForm } from '../../../components/auth/customer-login-form';
import { stitchImages } from '../../../lib/stitch-design';

export default function LoginPage(): React.JSX.Element {
  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden lg:block">
        <img alt="Pasta-Hane giriş görseli" className="absolute inset-0 h-full w-full object-cover" src={stitchImages.hero} />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(24,36,27,0.18),rgba(24,36,27,0.86))]" />
        <div className="relative z-10 flex h-full flex-col justify-end p-14 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Müşteri hesabı</p>
          <h2 className="mt-4 max-w-xl font-display text-5xl font-bold leading-tight">Siparişlerini, adreslerini ve puanlarını tek yerden yönet.</h2>
          <p className="mt-5 max-w-md text-sm leading-6 text-white/75">Taze ürünleri hızlıca tekrar sipariş et, ödeme ve teslimat adımlarını güvenle takip et.</p>
        </div>
      </section>
      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md rounded-[2rem] border border-outline-soft/40 bg-white p-6 shadow-soft sm:p-8 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
          <a className="font-display text-4xl font-bold text-primary" href="/">Pasta-Hane</a>
          <h1 className="mt-10 font-display text-4xl font-bold text-primary">Hesabına giriş yap</h1>
          <p className="mt-4 text-sm leading-6 text-muted">Siparişlerini takip etmek ve ödeme adımına devam etmek için müşteri hesabınla giriş yap.</p>
          <Suspense fallback={null}>
            <CustomerLoginBanner />
          </Suspense>
          <CustomerLoginForm />
        </div>
      </section>
    </main>
  );
}
