export function LoadingState({label='Yükleniyor…'}:{label?:string}){return <div className="rounded-3xl border bg-white p-5 text-sm text-stone-600">{label}</div>}
export function ErrorState({message}:{message:string}){return <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{message}</div>}
