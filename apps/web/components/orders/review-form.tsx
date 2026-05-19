'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { messageFromCustomerApiPayload, type ParsedCustomerApiPayload } from '../../lib/messages/customer-facing-errors';
import { reviewSchema, type ReviewValues } from '../../lib/reviews/schemas';

export function ReviewForm({ orderItemId, onSubmitted }: Readonly<{ orderItemId: string; onSubmitted: () => Promise<void> }>): React.JSX.Element {
  const [open, setOpen] = useState(false); const [busy, setBusy] = useState(false); const [message, setMessage] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<ReviewValues>({ resolver: zodResolver(reviewSchema), defaultValues: { rating: 5, comment: '' } });
  async function submit(values: ReviewValues): Promise<void> {
    setBusy(true); setMessage(null);
    const response = await fetch('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderItemId, ...values }) });
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as ParsedCustomerApiPayload;
      setMessage(messageFromCustomerApiPayload(response.status, payload, 'Yorum gönderilemedi. Lütfen tekrar deneyin.'));
      setBusy(false);
      await onSubmitted();
      return;
    }
    setMessage('Yorumunuz alındı. Yayına alınmadan önce onay bekleyecek.');
    setOpen(false); setBusy(false); await onSubmitted();
  }
  if (!open) return <div><button className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white" onClick={() => setOpen(true)} type="button">Bu ürünü değerlendir</button>{message ? <p className="mt-2 text-sm text-emerald-700">{message}</p> : null}</div>;
  return <form className="mt-3 space-y-3 rounded-2xl bg-amber-50 p-4" onSubmit={handleSubmit(submit)}><label className="block text-sm font-medium">Puan<select className="mt-1 w-full rounded-xl border px-3 py-2" {...register('rating', { valueAsNumber: true })}>{[5,4,3,2,1].map(v => <option key={v} value={v}>{v} yıldız</option>)}</select></label>{errors.rating ? <p className="text-sm text-red-700">{errors.rating.message}</p> : null}<label className="block text-sm font-medium">Yorum<textarea className="mt-1 min-h-24 w-full rounded-xl border px-3 py-2" placeholder="Deneyiminizi paylaşın." {...register('comment')} /></label>{errors.comment ? <p className="text-sm text-red-700">{errors.comment.message}</p> : null}<div className="flex gap-2"><button className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60" disabled={busy} type="submit">{busy ? 'Gönderiliyor…' : 'Yorumu gönder'}</button><button className="rounded-full border px-4 py-2 text-sm" disabled={busy} onClick={() => setOpen(false)} type="button">Vazgeç</button></div>{message ? <p className="text-sm text-red-700">{message}</p> : null}</form>;
}
