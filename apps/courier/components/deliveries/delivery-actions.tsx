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
    <div className="space-y-4">
      {delivery.status === 'ASSIGNED' ? (
        <button
          className="min-h-14 w-full rounded-2xl bg-stone-900 px-4 py-3 font-medium text-white disabled:opacity-60"
          disabled={busy}
          type="button"
          onClick={() => void mutate('pick-up')}
        >
          Teslim alındı
        </button>
      ) : null}
      {delivery.status === 'PICKED_UP' || delivery.status === 'OUT_FOR_DELIVERY' ? (
        <div className="grid gap-3">
          <button
            className="min-h-14 rounded-2xl bg-green-700 px-4 py-3 font-medium text-white disabled:opacity-60"
            disabled={busy}
            type="button"
            onClick={() => void mutate('deliver')}
          >
            Teslim edildi
          </button>
          <button
            className="min-h-14 rounded-2xl border border-red-200 bg-white px-4 py-3 font-medium text-red-700 disabled:opacity-60"
            disabled={busy}
            type="button"
            onClick={() => setShowFailure(true)}
          >
            Teslim edilemedi
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
