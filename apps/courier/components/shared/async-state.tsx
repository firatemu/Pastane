export function LoadingState({label='Yükleniyor…'}:{label?:string}):React.JSX.Element{return <div className="rounded-3xl border bg-white p-5 text-sm text-stone-600">{label}</div>}
export function EmptyState(): React.JSX.Element {
  return (
    <div className="rounded-3xl border border-dashed bg-white p-6 text-center">
      <p className="text-lg font-semibold">Atanmış teslimat yok</p>
      <p className="mt-2 text-sm text-stone-600">Yeni görev atandığında burada listelenir; sayfa her 15 saniyede sunucudan yenilenir.</p>
    </div>
  );
}
export function ErrorState({message}:{message:string}):React.JSX.Element{return <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{message}</div>}
