export default function AccessDeniedPage(): React.JSX.Element {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <section className="w-full max-w-md rounded-[2rem] border border-red-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-red-700">Erişim reddedildi</p>
        <h1 className="mt-3 text-3xl font-semibold">Bu alan yalnızca müşteriler içindir</h1>
        <p className="mt-3 text-sm leading-6 text-stone-600">Sipariş ve ödeme alanlarına yalnızca müşteri hesabıyla erişebilirsin.</p>
      </section>
    </main>
  );
}
