'use client';

import { useState } from 'react';

import { courierFetch } from '../../lib/api/deliveries';
import { courierMessageFromUnknownError } from '../../lib/deliveries/courier-api-error';
import type { DeliveryDetail } from '../../lib/deliveries/types';
import { FailedDeliveryForm } from './failed-delivery-form';

export function DeliveryActions({
  delivery,
  onChanged,
  onError,
}: {
  delivery: DeliveryDetail;
  onChanged: () => Promise<void>;
  onError: (message: string) => void;
}): React.JSX.Element | null {
  const [busy, setBusy] = useState(false);
  const [showFailure, setShowFailure] = useState(false);

  async function mutate(path: string, body?: unknown): Promise<boolean> {
    setBusy(true);
    try {
      await courierFetch(`/my/${delivery.id}/${path}`, {
        method: 'PATCH',
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      await onChanged();
      return true;
    } catch (caught) {
      onError(courierMessageFromUnknownError(caught, 'İşlem başarısız.'));
      return false;
    } finally {
      setBusy(false);
    }
  }

  if (delivery.status === 'DELIVERED' || delivery.status === 'FAILED') return null;

  return (
    <div className="space-y-3">
      {delivery.status === 'ASSIGNED' ? (
        <button
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={busy}
          type="button"
          onClick={() => void mutate('pick-up')}
        >
          <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
          </svg>
          {busy ? 'İşleniyor…' : 'Teslim Alındı'}
        </button>
      ) : null}
      {delivery.status === 'PICKED_UP' || delivery.status === 'OUT_FOR_DELIVERY' ? (
        <div className="grid gap-2">
          <button
            className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={busy}
            type="button"
            onClick={() => void mutate('deliver')}
          >
            <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            {busy ? 'İşleniyor…' : 'Teslim Edildi'}
          </button>
          <button
            className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 text-sm font-medium text-red-700 shadow-sm transition hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={busy}
            type="button"
            onClick={() => setShowFailure(true)}
          >
            <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
            Teslim Edilemedi
          </button>
        </div>
      ) : null}
      {showFailure ? (
        <FailedDeliveryForm
          busy={busy}
          onCancel={() => setShowFailure(false)}
          onSubmit={async (values) => {
            const ok = await mutate('fail', values);
            if (ok) setShowFailure(false);
          }}
        />
      ) : null}
    </div>
  );
}