'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { adminFetch } from '../../lib/api/catalog';
import { adminMessageFromUnknownError } from '../../lib/messages/admin-facing-errors';
import { optionGroupSchema, optionSchema } from '../../lib/catalog/schemas';
import type { Product } from '../../lib/catalog/types';
import { Field } from '../shared/form-field';
import { ErrorState } from '../shared/async-state';

type GroupForm = z.input<typeof optionGroupSchema>;
type OptionForm = z.input<typeof optionSchema>;

export function ProductOptionsPanel({ product, onChanged }: { product: Product; onChanged: () => Promise<void> }): React.JSX.Element {
  const [error, setError] = useState<string | null>(null);
  const group = useForm<GroupForm>({ resolver: zodResolver(optionGroupSchema), defaultValues: { name: '', isRequired: false, isMultiple: false, sortOrder: 0 } });
  const option = useForm<OptionForm>({ resolver: zodResolver(optionSchema), defaultValues: { name: '', priceModifier: 0, isActive: true, sortOrder: 0 } });

  async function addGroup(values: GroupForm): Promise<void> {
    try {
      setError(null);
      await adminFetch(`/products/${product.id}/option-groups`, { method: 'POST', body: JSON.stringify(values) });
      group.reset();
      await onChanged();
    } catch (caught) {
      setError(adminMessageFromUnknownError(caught, 'Opsiyon grubu eklenemedi.'));
    }
  }

  async function addOption(groupId: string, values: OptionForm): Promise<void> {
    try {
      setError(null);
      await adminFetch(`/products/${product.id}/option-groups/${groupId}/options`, { method: 'POST', body: JSON.stringify(values) });
      option.reset();
      await onChanged();
    } catch (caught) {
      setError(adminMessageFromUnknownError(caught, 'Opsiyon eklenemedi.'));
    }
  }

  return (
    <section className="space-y-4 rounded-3xl border bg-white p-5">
      <h2 className="font-semibold">Ürün opsiyonları</h2>
      {error ? <ErrorState message={error} /> : null}
      <form className="grid gap-3 sm:grid-cols-2" onSubmit={group.handleSubmit(addGroup)}>
        <Field label="Grup adı" error={group.formState.errors.name?.message}>
          <input className="w-full rounded-2xl border px-3 py-2" {...group.register('name')} />
        </Field>
        <Field label="Sıra" error={group.formState.errors.sortOrder?.message as string | undefined}>
          <input type="number" className="w-full rounded-2xl border px-3 py-2" {...group.register('sortOrder')} />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...group.register('isRequired')} /> Zorunlu
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...group.register('isMultiple')} /> Çoklu seçim
        </label>
        <button className="rounded-2xl bg-stone-900 px-4 py-2 text-white sm:col-span-2">Grup ekle</button>
      </form>
      {product.optionGroups.map((optionGroup) => (
        <div className="space-y-3 rounded-2xl border p-4" key={optionGroup.id}>
          <div className="font-medium">{optionGroup.name}</div>
          <div className="text-sm text-stone-600">{optionGroup.options.map((item) => `${item.name} (+${item.priceModifier})`).join(', ') || 'Henüz opsiyon yok'}</div>
          <form className="grid gap-3 sm:grid-cols-3" onSubmit={option.handleSubmit((values) => addOption(optionGroup.id, values))}>
            <Field label="Opsiyon" error={option.formState.errors.name?.message}>
              <input className="rounded-2xl border px-3 py-2" placeholder="Opsiyon" {...option.register('name')} />
            </Field>
            <Field label="Fiyat farkı" error={option.formState.errors.priceModifier?.message as string | undefined}>
              <input type="number" step="0.01" className="rounded-2xl border px-3 py-2" placeholder="Fiyat farkı" {...option.register('priceModifier')} />
            </Field>
            <button className="self-end rounded-2xl border px-4 py-2">Opsiyon ekle</button>
          </form>
        </div>
      ))}
    </section>
  );
}
