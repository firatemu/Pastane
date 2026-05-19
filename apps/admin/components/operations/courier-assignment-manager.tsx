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

export function CourierAssignmentManager({ permissions }: { permissions: string[] }): React.JSX.Element {
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
          '/orders?status=READY&deliveryType=HOME_DELIVERY&assigned=false&limit=100',
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
            className="rounded-2xl border px-3 py-2"
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
              className="text-amber-700 disabled:opacity-60"
              onClick={() => void assign(row.original.id)}
            >
              Ata
            </button>
          ) : null,
      },
    ],
    [busy, couriers, permissions, selected],
  );

  return (
    <PageSection title="Kurye Atama" description="Yalnızca hazır ve teslimat tipindeki siparişler listelenir.">
      <PollingNote seconds={15} />
      {loading ? (
        <LoadingState label="Kurye atama kuyruğu yükleniyor…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <DataTable data={orders} columns={cols} />
      )}
    </PageSection>
  );
}
