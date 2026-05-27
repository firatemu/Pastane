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
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const router = useRouter();
  const { register, handleSubmit, watch, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(addToCartSchema),
    defaultValues: { quantity: 1 },
  });
  const quantity = watch('quantity') || 1;
  const base = Number(product.discountedPrice ?? product.price);
  const optionTotal = product.optionGroups
    .flatMap((group) => group.options)
    .filter((option) => selectedOptionIds.includes(option.id))
    .reduce((sum, option) => sum + Number(option.priceModifier), 0);
  const previewTotal = ((base + optionTotal) * quantity).toFixed(2);
  const quantityField = register('quantity', { valueAsNumber: true, onChange: () => setReady(false) });

  function optionSelected(optionId: string): boolean {
    return selectedOptionIds.includes(optionId);
  }

  function toggleOption(groupId: string, optionId: string, multiple: boolean): void {
    setReady(false);
    setSelectedOptionIds((current) => {
      const group = product.optionGroups.find((item) => item.id === groupId);
      const groupOptionIds = new Set(group?.options.map((option) => option.id) ?? []);
      if (multiple) {
        return current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId];
      }
      return [...current.filter((id) => !groupOptionIds.has(id)), optionId];
    });
  }

  function missingRequiredOption(): string | null {
    const missing = product.optionGroups.find((group) => group.isRequired && !group.options.some((option) => selectedOptionIds.includes(option.id)));
    return missing ? `${missing.name} seçimi zorunlu.` : null;
  }

  async function submit(values: Values): Promise<void> {
    const requiredError = missingRequiredOption();
    if (requiredError) {
      setMessage(requiredError);
      return;
    }
    setBusy(true); setMessage(null);
    const response = await fetch('/api/cart/items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: product.id, quantity: values.quantity, optionIds: selectedOptionIds }) });
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
      {product.optionGroups.length ? (
        <div className="space-y-5">
          {product.optionGroups.map((group) => (
            <fieldset className="rounded-3xl border border-outline-soft/50 bg-surface-low p-4" key={group.id}>
              <legend className="px-1 text-sm font-extrabold text-primary">{group.name}{group.isRequired ? ' *' : ''}</legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {group.options.filter((option) => option.isActive).map((option) => {
                  const active = optionSelected(option.id);
                  return (
                    <button
                      className={`rounded-full border px-4 py-2 text-sm font-bold transition ${active ? 'border-primary bg-primary text-white' : 'border-outline-soft/60 bg-white text-primary hover:border-primary'}`}
                      key={option.id}
                      onClick={() => toggleOption(group.id, option.id, group.isMultiple)}
                      type="button"
                    >
                      {option.name}{Number(option.priceModifier) ? ` +${formatTry(option.priceModifier)}` : ''}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap items-end gap-3 sm:gap-4">
        <label className="w-24 shrink-0 space-y-2 text-sm font-medium">
          <span className="font-semibold text-primary">Adet</span>
          <input className="w-full rounded-2xl border border-outline-soft/60 bg-white px-3 py-3 text-center font-extrabold outline-none focus:border-primary" min={1} type="number" {...quantityField} />
          {errors.quantity ? <span className="block text-xs text-red-700">{errors.quantity.message}</span> : null}
        </label>
        <div className="min-w-[12rem] flex-1 rounded-2xl bg-surface-low px-4 py-3 sm:flex-none">
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
