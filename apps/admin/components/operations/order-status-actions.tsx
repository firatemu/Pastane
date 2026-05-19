'use client';

import { useState } from 'react';
import { adminFetch } from '../../lib/api/catalog';
import { adminMessageFromUnknownError } from '../../lib/messages/admin-facing-errors';
import { NEXT_STATUS, STATUS_LABELS } from '../../lib/operations/status';
import type { OrderStatus } from '../../lib/operations/types';
import { can } from '../../lib/permissions/can';

const PAYMENT_SUCCESS = 'SUCCESS';

function paymentReceived(payments?: Array<{ status: string }>): boolean {
  return Array.isArray(payments) && payments.some((p) => p.status === PAYMENT_SUCCESS);
}

export function OrderStatusActions({
  orderId,
  status,
  payments,
  permissions,
  onChanged,
}: {
  orderId: string;
  status: OrderStatus;
  payments?: Array<{ status: string }>;
  permissions: string[];
  onChanged: () => Promise<void>;
}): React.JSX.Element | null {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const hasPaidSuccess = paymentReceived(payments);

  async function patchStatus(next: OrderStatus, note?: string): Promise<void> {
    setBusy(true);
    try {
      setError(null);
      await adminFetch(`/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify(
          note !== undefined ? { status: next, note } : { status: next },
        ),
      });
      setCancelReason('');
      await onChanged();
    } catch (e) {
      setError(adminMessageFromUnknownError(e, 'Durum güncellenemedi.'));
    } finally {
      setBusy(false);
    }
  }

  async function cancelWithReason(): Promise<void> {
    const trimmed = cancelReason.trim();
    if (trimmed.length < 5) return;
    await patchStatus('CANCELLED', trimmed);
  }

  if (!can(permissions, ['orders.updateStatus'])) return null;

  const transitions = NEXT_STATUS[status];
  const flowTargets = transitions.filter((s) => s !== 'CANCELLED');
  const canCancelViaFlow = transitions.includes('CANCELLED');

  const showPaymentBlocked = status === 'PAYMENT_PENDING' && !hasPaidSuccess;
  const showWrongStateForFulfillment =
    !hasPaidSuccess && status !== 'PAYMENT_PENDING' && flowTargets.length > 0;

  return (
    <div className="space-y-4">
      {showPaymentBlocked ? (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Bu sipariş ödeme bekliyor; admin panelinden &quot;Onaylandı&quot; veya sonraki aşamalara geçiş yapılmaz —
          başarılı ödeme ile durum otomatik güncellenir. Şimdilik yalnızca iptal (açıklama zorunlu) yapabilirsiniz.
        </p>
      ) : null}
      {showWrongStateForFulfillment ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          Başarılı ödeme kaydı bulunmuyor; tamamlanan sipariş süreci için beklenenden farklı bir durum oluşmuş olabilir.
        </p>
      ) : null}
      {flowTargets.length > 0 ? (
        <div>
          <p className="mb-2 text-sm font-medium text-stone-700">İş akışı sonraki durumları</p>
          <div className="flex flex-wrap gap-2">
            {flowTargets.map((s) => (
              <button
                disabled={
                  busy ||
                  (!hasPaidSuccess && flowTargets.length > 0 && status !== 'PAYMENT_PENDING')
                }
                className="rounded-2xl border px-3 py-2 text-sm disabled:opacity-60"
                key={s}
                type="button"
                onClick={() => void patchStatus(s)}
              >
                → {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {canCancelViaFlow ? (
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
          <p className="text-sm font-medium text-stone-800">İptal</p>
          <p className="mt-1 text-xs text-stone-600">
            Tüm iptallerde iptal nedeni zorunludur (en az 5 karakter).
            {status === 'DELIVERED' ? ' Teslim edilmiş siparişlerde başka bir duruma geçilemez.' : null}
          </p>
          <textarea
            className="mt-3 min-h-[80px] w-full rounded-2xl border bg-white px-3 py-2 text-sm"
            placeholder="İptal nedeni…"
            value={cancelReason}
            disabled={busy}
            onChange={(e) => setCancelReason(e.target.value)}
          />
          <button
            type="button"
            disabled={
              busy ||
              cancelReason.trim().length < 5 ||
              ((status !== 'PAYMENT_PENDING') && !hasPaidSuccess && status !== 'DELIVERED')
            }
            className="mt-3 rounded-2xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-800 disabled:opacity-60"
            onClick={() => void cancelWithReason()}
          >
            İptal et
          </button>
        </div>
      ) : null}
      {!canCancelViaFlow ? (
        status === 'CANCELLED' ? (
          <p className="text-sm text-stone-600">Sipariş iptal edildi.</p>
        ) : (
          <p className="text-sm text-stone-600">Bu sipariş durumu için seçilecek işlem kalmadı.</p>
        )
      ) : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
