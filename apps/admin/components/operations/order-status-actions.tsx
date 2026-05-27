'use client';

import { useState } from 'react';
import { adminFetch } from '../../lib/api/catalog';
import { adminMessageFromUnknownError } from '../../lib/messages/admin-facing-errors';
import { getAdminWorkflowTargets, NEXT_STATUS, STATUS_LABELS } from '../../lib/operations/status';
import type { OrderStatus } from '../../lib/operations/types';
import { can } from '../../lib/permissions/can';
import { StatusBadge } from '../shared/status-badge';

const PAYMENT_SUCCESS = 'SUCCESS';

function paymentReceived(payments?: Array<{ status: string }>): boolean {
  return Array.isArray(payments) && payments.some((p) => p.status === PAYMENT_SUCCESS);
}

export function OrderStatusActions({
  orderId,
  status,
  deliveryType,
  payments,
  permissions,
  onChanged,
}: {
  orderId: string;
  status: OrderStatus;
  deliveryType: 'HOME_DELIVERY' | 'PICKUP';
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

  const transitions = getAdminWorkflowTargets({ status, deliveryType });
  const flowTargets = transitions.filter((s) => s !== 'CANCELLED');
  const canCancelViaFlow = transitions.includes('CANCELLED');
  const nextFlowStatus = flowTargets[0] ?? null;

  const showPaymentBlocked = status === 'PAYMENT_PENDING' && !hasPaidSuccess;
  const showWrongStateForFulfillment =
    !hasPaidSuccess && status !== 'PAYMENT_PENDING' && flowTargets.length > 0;
  const courierAssignmentManaged =
    deliveryType === 'HOME_DELIVERY' &&
    (status === 'PREPARING' || status === 'READY' || status === 'DELIVERY_FAILED');
  const courierManagedProgress =
    deliveryType === 'HOME_DELIVERY' &&
    (status === 'ASSIGNED_TO_COURIER' || status === 'OUT_FOR_DELIVERY');
  const visibleNextStatus: OrderStatus | null = showPaymentBlocked
    ? 'CONFIRMED'
    : courierAssignmentManaged || courierManagedProgress
      ? NEXT_STATUS[status].find((candidate) => candidate !== 'CANCELLED') ?? null
      : nextFlowStatus;
  const statusActionHint = showPaymentBlocked
    ? 'Ödeme tamamlanana kadar manuel durum değişikliği yapılamaz. Başarılı ödeme sonrası sipariş otomatik olarak onaylanır; bu alanda şimdilik yalnızca iptal işlemi yapılabilir.'
    : courierAssignmentManaged
      ? status === 'DELIVERY_FAILED'
        ? 'Teslim edilemeyen siparişi yeniden dağıtıma çıkarmak için kurye atamasını kurye bölümünden yapın.'
        : 'Adrese teslim siparişlerde hazırlık tamamlandığında kurye atamasını kurye bölümünden yapın. Bu alanda artık ayrı bir "Hazır" adımı yok.'
      : courierManagedProgress
        ? 'Kurye atandıktan sonraki teslimat adımları yalnızca kurye uygulamasından ilerler. Admin bu bölümde sadece bilgilendirme görür.'
    : flowTargets.length > 0
      ? 'Siparişin şu anki durumunu ve sıradaki uygun adımı burada görür, ardından aşağıdaki butonlarla durumu hemen güncellersiniz.'
      : canCancelViaFlow
        ? 'Normal iş akışı tamamlandı. Gerekirse bu alandan yalnızca iptal işlemi yapılabilir.'
        : 'Bu sipariş için tamamlanmış iş akışı dışında ek durum değişikliği bulunmuyor.';

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-sky-200 bg-sky-50 p-4">
        <div className="space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-sky-950">Sipariş durumunu bu bölümden değiştirin</p>
              <p className="mt-1 text-sm leading-6 text-sky-900">{statusActionHint}</p>
            </div>
            {flowTargets.length > 0 ? (
              <span className="inline-flex w-fit rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-semibold text-sky-950">
                Aşağıdaki butonlardan birini seçin
              </span>
            ) : null}
          </div>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
            <div className="rounded-2xl border border-white bg-white/90 p-3">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-stone-500">Şu anki durum</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusBadge status={status} />
                <span className="text-sm text-stone-600">Sipariş şu anda bu aşamada.</span>
              </div>
            </div>
            <div
              className="hidden items-center justify-center text-2xl font-semibold text-sky-300 lg:flex"
              aria-hidden="true"
            >
              →
            </div>
            <div className="rounded-2xl border border-white bg-white/90 p-3">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-stone-500">
                {showPaymentBlocked ? 'Sıradaki otomatik durum' : 'Sıradaki durum'}
              </p>
              {visibleNextStatus ? (
                <>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusBadge status={visibleNextStatus} />
                    <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700">
                      {showPaymentBlocked ? 'Otomatik ilerler' : 'Önerilen adım'}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-stone-600">
                    {showPaymentBlocked
                      ? `"${STATUS_LABELS[visibleNextStatus]}" durumu, ödeme onayı geldikten sonra sistem tarafından otomatik uygulanır.`
                      : courierAssignmentManaged
                        ? `"${STATUS_LABELS[visibleNextStatus]}" durumuna geçiş, kurye atama işlemiyle yapılır.`
                        : courierManagedProgress
                          ? `Bu siparişin sıradaki teslimat adımı "${STATUS_LABELS[visibleNextStatus]}". İlerletme işlemi yalnızca kurye panelinden yapılabilir.`
                        : `Siparişi bir sonraki aşama olan "${STATUS_LABELS[visibleNextStatus]}" durumuna geçirebilirsiniz.`}
                  </p>
                </>
              ) : canCancelViaFlow ? (
                <>
                  <p className="mt-2 text-sm font-semibold text-stone-900">Normal akış tamamlandı</p>
                  <p className="mt-1 text-sm text-stone-600">
                    Bu noktadan sonra standart ilerleme yerine yalnızca iptal işlemi yapılabilir.
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-2 text-sm font-semibold text-stone-900">Geçiş kalmadı</p>
                  <p className="mt-1 text-sm text-stone-600">
                    Sipariş için seçilebilir yeni bir durum bulunmuyor.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
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
        <div className="rounded-3xl border border-stone-200 bg-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-stone-900">Durumu değiştir</p>
              <p className="mt-1 text-xs leading-5 text-stone-600">
                {flowTargets.length > 1
                  ? 'Sipariş durumunu değiştirmek için aşağıdaki seçeneklerden birine tıklayın. İlk buton önerilen sıradaki adımdır.'
                  : 'Sipariş durumunu değiştirmek için aşağıdaki butona tıklayın.'}
              </p>
            </div>
            {nextFlowStatus ? (
              <span className="inline-flex w-fit rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700">
                Önerilen: {STATUS_LABELS[nextFlowStatus]}
              </span>
            ) : null}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {flowTargets.map((s, index) => (
              <button
                disabled={
                  busy ||
                  (!hasPaidSuccess && flowTargets.length > 0 && status !== 'PAYMENT_PENDING')
                }
                className={`rounded-2xl border px-4 py-2 text-sm font-semibold disabled:opacity-60 ${
                  index === 0
                    ? 'border-stone-900 bg-stone-900 text-white'
                    : 'border-stone-300 bg-white text-stone-900'
                }`}
                key={s}
                type="button"
                onClick={() => void patchStatus(s)}
              >
                {index === 0
                  ? `${STATUS_LABELS[s]} durumuna geçir`
                  : `${STATUS_LABELS[s]} olarak güncelle`}
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
