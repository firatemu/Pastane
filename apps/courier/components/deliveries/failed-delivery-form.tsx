'use client';

import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';

import { failDeliverySchema } from '../../lib/deliveries/schemas';

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
    resolver: zodResolver(failDeliverySchema) as Resolver<Form>,
    defaultValues: { reason: '' },
  });

  const reasonError = form.formState.errors.reason?.message;

  return (
    <form
      className="space-y-4 rounded-xl border border-red-200 bg-white p-4"
      onSubmit={form.handleSubmit(async (values) => {
        await onSubmit(values);
      })}
    >
      <div className="flex items-center gap-2">
        <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
        </svg>
        <h3 className="text-sm font-semibold text-red-800">Teslim edilemedi</h3>
      </div>

      <div>
        <label htmlFor="fail-reason" className="mb-1.5 block text-xs font-medium text-stone-600">
          Neden <span className="text-red-500">*</span>
        </label>
        <textarea
          id="fail-reason"
          className={`block w-full rounded-lg border bg-stone-50 px-3 py-2.5 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:bg-white focus:ring-2 focus:ring-red-500/20 ${
            reasonError ? 'border-red-400 focus:border-red-500' : 'border-stone-200 focus:border-red-400'
          }`}
          rows={3}
          placeholder="Teslimat neden gerçekleştirilemedi?"
          {...form.register('reason')}
        />
        {reasonError ? <p className="mt-1 text-xs text-red-600">{reasonError}</p> : null}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          className="flex min-h-10 items-center justify-center rounded-lg border border-stone-200 bg-white px-3 text-sm font-medium text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={busy}
          onClick={onCancel}
          type="button"
        >
          Vazgeç
        </button>
        <button
          className="flex min-h-10 items-center justify-center rounded-lg bg-red-600 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={busy}
          type="submit"
        >
          {busy ? 'Gönderiliyor…' : 'Gönder'}
        </button>
      </div>
    </form>
  );
}