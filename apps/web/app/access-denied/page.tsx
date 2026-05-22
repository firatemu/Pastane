export default function AccessDeniedPage(): React.JSX.Element {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <section className="stitch-panel w-full max-w-md rounded-3xl p-8 text-center">
        <p className="stitch-eyebrow text-error">Erişim reddedildi</p>
        <h1 className="mt-3 font-display text-4xl font-semibold text-primary">Bu alan yalnızca müşteriler içindir</h1>
        <p className="mt-4 text-sm leading-6 text-muted">Sipariş ve ödeme alanlarına yalnızca müşteri hesabıyla erişebilirsin.</p>
        <a className="stitch-button mt-6" href="/giris">Giriş yap</a>
      </section>
    </main>
  );
}
