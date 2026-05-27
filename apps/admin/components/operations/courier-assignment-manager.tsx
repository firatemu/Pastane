'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { adminFetch, adminFetchEnvelope } from '../../lib/api/catalog';
import { adminMessageFromUnknownError } from '../../lib/messages/admin-facing-errors';
import type { Courier, OrderListItem } from '../../lib/operations/types';
import { DataTable } from '../shared/data-table';
import { PageSection } from '../shared/page-section';
import { PollingNote } from '../shared/polling-note';
import { can } from '../../lib/permissions/can';
import { ErrorState, LoadingState } from '../shared/async-state';
import { adminPrimaryButtonClass, adminSelectClass } from '../shared/admin-form-controls';

export function CourierAssignmentManager({
  permissions,
}: {
  permissions: string[];
}): React.JSX.Element {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function load(): Promise<void> {
    try {
      setError(null);
      const [o, c] = await Promise.all([
        adminFetchEnvelope<OrderListItem[]>(
          '/orders?status=PREPARING&deliveryType=HOME_DELIVERY&assigned=false&limit=100',
        ),
        adminFetchEnvelope<Courier[]>('/couriers?status=ACTIVE&limit=100'),
      ]);
      setOrders(o.data);
      setCouriers(c.data);
    } catch (e) {
      setError(adminMessageFromUnknownError(e, 'Kurye atama kuyruğu yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 15000);
    return () => clearInterval(id);
  }, []);

  async function assign(orderId: string): Promise<void> {
    const courierId = selected[orderId];
    if (!courierId) return;
    setBusy(orderId);
    try {
      setError(null);
      await adminFetch(`/orders/${orderId}/assign-courier`, {
        method: 'POST',
        body: JSON.stringify({ courierId }),
      });
      await load();
    } catch (e) {
      setError(adminMessageFromUnknownError(e, 'Kurye atanamadı.'));
    } finally {
      setBusy(null);
    }
  }

  const cols = useMemo<ColumnDef<OrderListItem>[]>(
    () => [
      { header: 'Sipariş', accessorKey: 'orderNumber' },
      {
        header: 'Müşteri',
        cell: ({ row }) => `${row.original.user.firstName} ${row.original.user.lastName}`,
      },
      {
        header: 'Kurye',
        cell: ({ row }) => (
          <select
            className={adminSelectClass}
            value={selected[row.original.id] ?? ''}
            onChange={(e) => setSelected((v) => ({ ...v, [row.original.id]: e.target.value }))}
          >
            <option value="">Seçin</option>
            {couriers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.user.firstName} {c.user.lastName}
              </option>
            ))}
          </select>
        ),
      },
      {
        header: 'Aksiyon',
        cell: ({ row }) =>
          can(permissions, ['orders.assignCourier']) ? (
            <button
              type="button"
              disabled={busy === row.original.id}
              className={`${adminPrimaryButtonClass} px-3 py-2 disabled:opacity-60`}
              onClick={() => void assign(row.original.id)}
            >
              <span className="material-symbols-outlined text-[18px]">local_shipping</span>
              Ata
            </button>
          ) : null,
      },
    ],
    [busy, couriers, permissions, selected],
  );

  return (
    <PageSection
      title="Kurye Atama"
      description="Kurye ataması yapılacak ev teslimatı siparişlerini uygun aktif kuryelere atayın."
    >
      {loading ? (
        <LoadingState label="Kurye atama kuyruğu yükleniyor…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <div className="space-y-stack-md">
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryTile icon="shopping_bag" label="Atanacak sipariş" value={orders.length} />
            <SummaryTile icon="electric_bike" label="Aktif kurye" value={couriers.length} />
            <SummaryTile icon="schedule" label="Yenileme" value="15 sn" />
          </div>

          <div className="flex flex-col gap-3 rounded-card border border-outline-variant/35 bg-surface-container-lowest p-4 shadow-bakery sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-on-surface">Atama kuyruğu</h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                Yalnızca ev teslimatı, hazırlık aşamasında olup henüz kurye atanmamış siparişler listelenir.
              </p>
            </div>
            <PollingNote seconds={15} />
          </div>

          <DataTable data={orders} columns={cols} empty="Atanacak sipariş bulunamadı." />
        </div>
      )}
    </PageSection>
  );
}

function SummaryTile({
  icon,
  label,
  value,
}: Readonly<{ icon: string; label: string; value: string | number }>): React.JSX.Element {
  return (
    <div className="rounded-card border border-outline-variant/35 bg-surface-container-lowest p-4 shadow-bakery">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-on-surface-variant">{label}</span>
        <span className="material-symbols-outlined text-[22px] text-secondary">{icon}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-on-surface">{value}</p>
    </div>
  );
}
