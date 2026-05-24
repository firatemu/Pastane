'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { Product } from '../../lib/catalog/types';
import { messageFromCustomerApiPayload, type ParsedCustomerApiPayload } from '../../lib/messages/customer-facing-errors';
import { formatTry } from '../shared/price';

const addToCartSchema = z.object({
  quantity: z.number().int().min(1, 'Adet en az 1 olmalı.'),
});

export function ProductOptionsForm({ product }: Readonly<{ product: Product }>): React.JSX.Element {
  const soldOut = product.isPurchasable === false;
  type Values = z.infer<typeof addToCartSchema>;
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const { register, handleSubmit, watch, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(addToCartSchema),
    defaultValues: { quantity: 1 },
  });
  const quantity = watch('quantity') || 1;
  const base = Number(product.discountedPrice ?? product.price);
  const previewTotal = (base * quantity).toFixed(2);
  const quantityField = register('quantity', { valueAsNumber: true, onChange: () => setReady(false) });

  async function submit(values: Values): Promise<void> {
    setBusy(true); setMessage(null);
    const response = await fetch('/api/cart/items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: product.id, quantity: values.quantity, optionIds: [] }) });
    if (response.status === 401) { router.push('/giris?neden=oturum'); return; }
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as ParsedCustomerApiPayload;
      setMessage(messageFromCustomerApiPayload(response.status, payload, 'Ürün sepete eklenemedi. Lütfen tekrar deneyin.'));
      setBusy(false);
      return;
    }
    setReady(true); setBusy(false); router.push('/sepet'); router.refresh();
  }
  return (
    <form className="mt-8 space-y-6 border-t border-outline-soft/30 pt-8" onSubmit={handleSubmit(submit)}>
      {soldOut ? (
        <div className="rounded-2xl border border-outline-soft/50 bg-surface-low px-4 py-4 text-sm text-muted">
          <p className="font-semibold text-ink">Ürün tükendi</p>
          <p className="mt-1">Bu ürün şu an satışa kapalı. Daha sonra tekrar kontrol edebilirsiniz.</p>
        </div>
      ) : null}
      <div className="flex flex-wrap items-end gap-3 sm:gap-4">
        <label className="w-16 shrink-0 space-y-2 text-sm font-medium sm:w-20">
          <span>Adet</span>
          <input className="stitch-input w-full px-2 text-center" min={1} type="number" {...quantityField} />
          {errors.quantity ? <span className="block text-xs text-red-700">{errors.quantity.message}</span> : null}
        </label>
        <div className="min-w-[10rem] flex-1 rounded-2xl bg-surface-low px-4 py-3 sm:flex-none">
          <p className="text-sm text-muted">Ön izleme toplamı</p>
          <p className="mt-1 font-body text-lg font-bold text-error sm:text-xl">{formatTry(previewTotal)}</p>
        </div>
      </div>
      <button className="stitch-button w-full disabled:opacity-60" disabled={busy || soldOut} type="submit">{soldOut ? 'Satışa kapalı' : busy ? 'Ekleniyor...' : 'Sepete ekle'}</button>
      {ready ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Ürün sepete eklendi.</p> : null}
      {message ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p> : null}
    </form>
  );
}
