'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import type { Product } from '../../lib/catalog/types';
import { buildCustomizationSchema } from '../../lib/catalog/schemas';
import { messageFromCustomerApiPayload, type ParsedCustomerApiPayload } from '../../lib/messages/customer-facing-errors';
import { formatTry } from '../shared/price';

export function ProductOptionsForm({ product }: Readonly<{ product: Product }>): React.JSX.Element {
  const schema = useMemo(() => buildCustomizationSchema(product.optionGroups), [product.optionGroups]);
  type Values = z.infer<typeof schema>;
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { quantity: 1, note: '', selections: {} },
  });
  const selections = watch('selections');
  const quantity = watch('quantity') || 1;
  const selectedTotal = product.optionGroups.flatMap((group) => selections[group.id] ?? []).reduce((sum, optionId) => {
    const option = product.optionGroups.flatMap((group) => group.options).find((item) => item.id === optionId);
    return sum + Number(option?.priceModifier ?? 0);
  }, 0);
  const base = Number(product.discountedPrice ?? product.price);
  const previewTotal = ((base + selectedTotal) * quantity).toFixed(2);

  function toggle(groupId: string, optionId: string, multiple: boolean): void {
    const current = selections[groupId] ?? [];
    const next = multiple ? (current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId]) : [optionId];
    setValue(`selections.${groupId}`, next, { shouldValidate: true });
    setReady(false);
  }

  async function submit(values: Values): Promise<void> {
    setBusy(true); setMessage(null);
    const optionIds = Object.values(values.selections).flat();
    const response = await fetch('/api/cart/items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: product.id, quantity: values.quantity, optionIds, customNote: values.note || undefined }) });
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
    <form className="space-y-6 rounded-[2rem] border border-amber-200/70 bg-white p-5 shadow-sm sm:p-6" onSubmit={handleSubmit(submit)}>
      {product.optionGroups.length ? product.optionGroups.map((group) => {
        const activeOptions = group.options.filter((option) => option.isActive);
        return (
          <fieldset className="space-y-3" key={group.id}>
            <legend className="font-semibold text-stone-950">{group.name}{group.isRequired ? <span className="text-amber-700"> *</span> : null}</legend>
            {activeOptions.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {activeOptions.map((option) => {
                  const checked = (selections[group.id] ?? []).includes(option.id);
                  return (
                    <label className={`cursor-pointer rounded-2xl border p-4 transition ${checked ? 'border-amber-500 bg-amber-50' : 'border-stone-200 hover:border-amber-300'}`} key={option.id}>
                      <input className="sr-only" checked={checked} onChange={() => toggle(group.id, option.id, group.isMultiple)} type={group.isMultiple ? 'checkbox' : 'radio'} />
                      <span className="block font-medium">{option.name}</span>
                      <span className="mt-1 block text-sm text-stone-500">{Number(option.priceModifier) ? `+ ${formatTry(option.priceModifier)}` : 'Fiyat farkı yok'}</span>
                    </label>
                  );
                })}
              </div>
            ) : <p className="rounded-2xl bg-stone-50 px-4 py-3 text-sm text-stone-600">Bu seçenek grubu için aktif seçenek bulunmuyor.</p>}
            {errors.selections?.[group.id] ? <p className="text-sm text-red-700">{String(errors.selections[group.id]?.message)}</p> : null}
          </fieldset>
        );
      }) : <p className="rounded-2xl bg-stone-50 px-4 py-3 text-sm text-stone-600">Bu ürün için ek özelleştirme seçeneği yok.</p>}
      <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
        <label className="space-y-2 text-sm font-medium">
          <span>Adet</span>
          <input className="w-full rounded-2xl border px-4 py-3" min={1} type="number" {...register('quantity', { valueAsNumber: true })} onChange={() => setReady(false)} />
          {errors.quantity ? <span className="block text-red-700">{errors.quantity.message}</span> : null}
        </label>
        <label className="space-y-2 text-sm font-medium">
          <span>Not</span>
          <textarea className="min-h-24 w-full rounded-2xl border px-4 py-3" placeholder="Örn. Pastanın üzerine İyi ki doğdun yazılsın." {...register('note')} onChange={() => setReady(false)} />
        </label>
      </div>
      <div className="rounded-2xl bg-amber-50 p-4">
        <p className="text-sm text-stone-600">Ön izleme toplamı</p>
        <p className="mt-1 text-2xl font-semibold">{formatTry(previewTotal)}</p>
        <p className="mt-2 text-xs text-stone-500">Nihai fiyat ve stok doğrulaması ödeme akışında sunucu tarafından yapılır.</p>
      </div>
      <button className="w-full rounded-2xl bg-stone-900 px-5 py-4 font-medium text-white hover:bg-stone-800 disabled:opacity-60" disabled={busy} type="submit">{busy ? 'Ekleniyor…' : 'Sepete ekle'}</button>
      {ready ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Ürün sepete eklendi.</p> : null}
      {message ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p> : null}
    </form>
  );
}