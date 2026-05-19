import { Suspense } from 'react';
import { CustomerLoginBanner } from '../../../components/auth/customer-login-banner';
import { CustomerLoginForm } from '../../../components/auth/customer-login-form';

export default function LoginPage(): React.JSX.Element {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 via-[#fffaf3] to-rose-50 p-4">
      <section className="w-full max-w-md rounded-[2rem] border border-amber-200/70 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-700">Pastane</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Hesabına giriş yap</h1>
        <p className="mt-3 text-sm leading-6 text-stone-600">Siparişlerini takip etmek ve ödeme adımına devam etmek için müşteri hesabınla giriş yap.</p>
        <Suspense fallback={null}>
          <CustomerLoginBanner />
        </Suspense>
        <CustomerLoginForm />
      </section>
    </main>
  );
}
