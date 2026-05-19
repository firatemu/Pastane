'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';

import { failDeliverySchema } from '../../lib/deliveries/schemas';
import { Field } from '../shared/form-field';

type Form = z.input<typeof failDeliverySchema>;

export function FailedDeliveryForm({
  busy,
  onSubmit,
  onCancel,
}: {
  busy: boolean;
  onSubmit: (values: Form) => Promise<void>;
  onCancel: () => void;
}): React.JSX.Element {
  const form = useForm<Form>({
    resolver: zodResolver(failDeliverySchema),
    defaultValues: { reason: '' },
  });

  return (
    <form
      className="space-y-4 rounded-3xl border border-red-100 bg-white p-5"
      onSubmit={form.handleSubmit(async (values) => {
        await onSubmit(values);
      })}
    >
      <h2 className="font-semibold">Teslim edilemedi</h2>
      <Field label="Neden" error={form.formState.errors.reason?.message}>
        <textarea className="min-h-28 w-full rounded-2xl border px-4 py-3" {...form.register('reason')} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <button className="min-h-12 rounded-2xl border px-4 py-3" disabled={busy} onClick={onCancel} type="button">
          Vazgeç
        </button>
        <button className="min-h-12 rounded-2xl bg-red-700 px-4 py-3 font-medium text-white disabled:opacity-60" disabled={busy} type="submit">
          Gönder
        </button>
      </div>
    </form>
  );
}
