import { CustomerRegisterForm } from '../../../components/auth/customer-register-form';
import { stitchImages } from '../../../lib/stitch-design';

export default function RegisterPage(): React.JSX.Element {
  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[0.95fr_1.05fr]">
      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg rounded-[2rem] border border-outline-soft/40 bg-white p-6 shadow-soft sm:p-8 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
          <a className="font-display text-4xl font-bold text-primary" href="/">Pasta-Hane</a>
          <h1 className="mt-10 font-display text-4xl font-bold text-primary">Müşteri hesabı oluştur</h1>
          <p className="mt-4 text-sm leading-6 text-muted">Adreslerini saklamak, siparişlerini görmek ve teslim sonrası yorum bırakmak için hesap oluştur.</p>
          <CustomerRegisterForm />
        </div>
      </section>
      <section className="relative hidden overflow-hidden lg:block">
        <img alt="Pastane kayıt görseli" className="absolute inset-0 h-full w-full object-cover" src={stitchImages.pastry} />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(24,36,27,0.12),rgba(24,36,27,0.82))]" />
        <div className="relative z-10 flex h-full flex-col justify-end p-14 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Premium deneyim</p>
          <h2 className="mt-4 max-w-xl font-display text-5xl font-bold leading-tight">Favori adreslerin ve siparişlerin her zaman hazır.</h2>
          <p className="mt-5 max-w-md text-sm leading-6 text-white/75">Kayıtlı hesapla ödeme daha hızlı, sipariş takibi daha net ve yorum bırakmak daha kolay.</p>
        </div>
      </section>
    </main>
  );
}
