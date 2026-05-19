import { CustomerRegisterForm } from '../../../components/auth/customer-register-form';

export default function RegisterPage(): React.JSX.Element {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 via-[#fffaf3] to-rose-50 p-4">
      <section className="w-full max-w-lg rounded-[2rem] border border-amber-200/70 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-700">Pastane</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Müşteri hesabı oluştur</h1>
        <p className="mt-3 text-sm leading-6 text-stone-600">Adreslerini saklamak, siparişlerini görmek ve teslim sonrası yorum bırakmak için hesap oluştur.</p>
        <CustomerRegisterForm />
      </section>
    </main>
  );
}
