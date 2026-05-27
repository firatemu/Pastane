export function LoadingState({ label = 'Yükleniyor…' }: { label?: string }): React.JSX.Element {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-5">
      <svg className="h-5 w-5 animate-spin text-amber-600" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z" />
      </svg>
      <span className="text-sm text-stone-600">{label}</span>
    </div>
  );
}

export function EmptyState(): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-stone-100">
        <svg className="h-7 w-7 text-stone-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25m-3.75 0V5.625m0 12.75v-2.25m0-5.625v2.25m0-2.25H5.625c-.621 0-1.125.504-1.125 1.125v5.25c0 .621.504 1.125 1.125 1.125m5.625-7.5h3.75m-3.75 0V5.625m0 0A2.625 2.625 0 0 1 13.875 3h.375a2.625 2.625 0 0 1 2.625 2.625V5.625m0 0h1.5" />
        </svg>
      </div>
      <p className="mt-4 text-base font-semibold text-stone-700">Atanmış teslimat yok</p>
      <p className="mt-1.5 max-w-sm text-sm text-stone-500">
        Yeni görev atandığında burada listelenir. Sayfa her 15 saniyede sunucudan otomatik yenilenir.
      </p>
    </div>
  );
}

export function ErrorState({ message }: { message: string }): React.JSX.Element {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
      <svg className="mt-0.5 h-5 w-5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
      </svg>
      <p className="text-sm text-red-700">{message}</p>
    </div>
  );
}