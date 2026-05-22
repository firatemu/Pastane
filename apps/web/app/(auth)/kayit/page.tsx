import { CustomerRegisterForm } from '../../../components/auth/customer-register-form';
import { stitchImages } from '../../../lib/stitch-design';

export default function RegisterPage(): React.JSX.Element {
  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[0.95fr_1.05fr]">
      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg">
          <a className="font-display text-4xl font-bold text-primary" href="/">Pasta-Hane</a>
          <h1 className="mt-10 font-display text-4xl font-bold text-primary">Müşteri hesabı oluştur</h1>
          <p className="mt-4 text-sm leading-6 text-muted">Adreslerini saklamak, siparişlerini görmek ve teslim sonrası yorum bırakmak için hesap oluştur.</p>
          <CustomerRegisterForm />
        </div>
      </section>
      <section className="relative hidden overflow-hidden lg:block">
        <img alt="Pastane kayıt görseli" className="absolute inset-0 h-full w-full object-cover" src={stitchImages.pastry} />
        <div className="absolute inset-0 bg-primary/45" />
        <div className="relative z-10 flex h-full flex-col justify-end p-14 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Member Atelier</p>
          <h2 className="mt-4 max-w-xl font-display text-5xl font-bold leading-tight">A personal patisserie shelf for every order.</h2>
        </div>
      </section>
    </main>
  );
}
