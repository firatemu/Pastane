import { LoginForm } from '../../../components/auth/login-form';

export default function LoginPage(): React.JSX.Element {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 via-white to-stone-100 p-6">
      <section className="w-full max-w-md rounded-3xl border bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-700">Pastane Admin</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Operasyon paneline giriş</h1>
        <p className="mt-3 text-sm leading-6 text-stone-600">Yalnızca yetkili yönetim ve operasyon hesapları erişebilir.</p>
        <LoginForm />
      </section>
    </main>
  );
}
