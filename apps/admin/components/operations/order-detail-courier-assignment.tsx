'use client';

import { useEffect, useState } from 'react';
import { adminFetch, adminFetchEnvelope } from '../../lib/api/catalog';
import { adminMessageFromUnknownError } from '../../lib/messages/admin-facing-errors';
import { can } from '../../lib/permissions/can';
import type { Courier, OrderDetail, OrderStatus } from '../../lib/operations/types';

const LOCKED_STATUSES: OrderStatus[] = ['OUT_FOR_DELIVERY', 'DELIVERED', 'DELIVERY_FAILED'];

/** Adrese teslim siparişlerde kurye atama / yeniden atama (yolda veya teslim edildiyse kapalı). */
export function OrderDetailCourierAssignment({
  order,
  permissions,
  onChanged,
}: {
  order: OrderDetail;
  permissions: string[];
  onChanged: () => Promise<void>;
}): React.JSX.Element | null {
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [courierError, setCourierError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const assignedId = order.delivery?.courier?.id ?? '';
  const [selectedCourierId, setSelectedCourierId] = useState(assignedId);

  useEffect(() => {
    setSelectedCourierId(assignedId);
  }, [assignedId]);

  const canAssign = can(permissions, ['orders.assignCourier']);
  const canListCouriers = can(permissions, ['couriers.view']);
  const isHome = order.deliveryType === 'HOME_DELIVERY';
  const editableStatuses: OrderStatus[] = ['READY', 'ASSIGNED_TO_COURIER'];
  const courierEditable =
    isHome &&
    editableStatuses.includes(order.status) &&
    !LOCKED_STATUSES.includes(order.status) &&
    canAssign &&
    canListCouriers;

  useEffect(() => {
    if (!courierEditable) return;
    let cancelled = false;
    async function loadCouriers(): Promise<void> {
      try {
        setCourierError(null);
        const envelope = await adminFetchEnvelope<Courier[]>('/couriers?status=ACTIVE&limit=100');
        if (!cancelled) setCouriers(envelope.data);
      } catch (e) {
        if (!cancelled) setCourierError(adminMessageFromUnknownError(e, 'Kurye listesi yüklenemedi.'));
      }
    }
    void loadCouriers();
    return () => {
      cancelled = true;
    };
  }, [courierEditable]);

  async function submit(): Promise<void> {
    if (!selectedCourierId || selectedCourierId === assignedId) return;
    setBusy(true);
    setAssignError(null);
    try {
      await adminFetch(`/orders/${order.id}/assign-courier`, {
        method: 'POST',
        body: JSON.stringify({ courierId: selectedCourierId }),
      });
      await onChanged();
    } catch (e) {
      setAssignError(adminMessageFromUnknownError(e, 'Kurye atanamadı.'));
    } finally {
      setBusy(false);
    }
  }

  if (!isHome) {
    return null;
  }

  const courierLabel = order.delivery?.courier
    ? `${order.delivery.courier.user.firstName} ${order.delivery.courier.user.lastName}`
    : 'Atanmadı';

  let permissionTip: React.JSX.Element | null = null;
  if (!(canAssign && canListCouriers) && editableStatuses.includes(order.status)) {
    permissionTip = (
      <p className="text-sm text-stone-500">
        Kurye atamak için <code className="text-xs">orders.assignCourier</code> ve{' '}
        <code className="text-xs">couriers.view</code> izinleri gerekir.
      </p>
    );
  }

  return (
    <section className="space-y-3 rounded-3xl border border-stone-200 bg-white p-4">
      <h2 className="font-semibold">Kurye</h2>
      <div className="text-sm text-stone-700">
        <div>
          Güncel: <span className="font-medium text-stone-900">{courierLabel}</span>
          {order.delivery?.courier ? (
            <span className="text-stone-500"> ({order.delivery.courier.user.phone})</span>
          ) : null}
        </div>
        {LOCKED_STATUSES.includes(order.status) ? (
          <p className="mt-2 text-stone-500">
            Sipariş yola çıktıktan veya teslim edildikten sonra kurye değiştirilemez.
          </p>
        ) : null}
      </div>
      {courierEditable ? (
        <>
          {courierError ? <p className="text-sm text-red-700">{courierError}</p> : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              className="grow rounded-2xl border px-3 py-2"
              value={selectedCourierId}
              onChange={(e) => setSelectedCourierId(e.target.value)}
              disabled={!!courierError}
            >
              <option value="">Kurye seçin</option>
              {couriers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.user.firstName} {c.user.lastName}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={
                busy || !selectedCourierId || selectedCourierId === assignedId || !!courierError
              }
              className="rounded-2xl bg-amber-600 px-4 py-2 font-medium text-white disabled:opacity-50"
              onClick={() => void submit()}
            >
              {order.status === 'READY' ? 'Ata' : 'Kuryeyi değiştir'}
            </button>
          </div>
          {assignError ? <p className="text-sm text-red-700">{assignError}</p> : null}
        </>
      ) : (
        permissionTip
      )}
    </section>
  );
}
