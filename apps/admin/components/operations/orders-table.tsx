'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { adminFetchEnvelope } from '../../lib/api/catalog';
import { formatTry } from '../../lib/format/format-try';
import { adminMessageFromUnknownError } from '../../lib/messages/admin-facing-errors';
import { DELIVERY_TYPE_LABELS, STATUS_LABELS } from '../../lib/operations/status';
import type { OrderListItem, OrderStatus } from '../../lib/operations/types';
import { DataTable } from '../shared/data-table';
import { PageSection } from '../shared/page-section';
import { PollingNote } from '../shared/polling-note';
import { StatusBadge } from '../shared/status-badge';
import { ErrorState, LoadingState } from '../shared/async-state';

const STATUS_FILTER_OPTIONS: OrderStatus[] = [
  'PAYMENT_PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'ASSIGNED_TO_COURIER',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'DELIVERY_FAILED',
  'CANCELLED',
];

export function OrdersTable(): React.JSX.Element {
  const [rows, setRows] = useState<OrderListItem[]>([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<{ page: number; totalPages: number; total: number } | null>(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(): Promise<void> {
    try {
      setError(null);
      const q = new URLSearchParams({ page: String(page), limit: '10' });
      if (status) q.set('status', status);
      const r = await adminFetchEnvelope<OrderListItem[]>(`/orders?${q}`);
      setRows(r.data);
      setMeta(r.meta as typeof meta);
    } catch (e) {
      setError(adminMessageFromUnknownError(e, 'Siparişler yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 15000);
    return () => clearInterval(id);
  }, [page, status]);

  const cols = useMemo<ColumnDef<OrderListItem>[]>(
    () => [
      { header: 'No', accessorKey: 'orderNumber' },
      {
        header: 'Müşteri',
        cell: ({ row }) => `${row.original.user.firstName} ${row.original.user.lastName}`,
      },
      {
        header: 'Teslimat',
        cell: ({ row }) => DELIVERY_TYPE_LABELS[row.original.deliveryType] ?? row.original.deliveryType,
      },
      {
        header: 'Durum',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        header: 'Tutar',
        cell: ({ row }) => formatTry(row.original.grandTotal),
      },
      {
        header: 'Kurye',
        cell: ({ row }) =>
          row.original.delivery?.courier
            ? `${row.original.delivery.courier.user.firstName} ${row.original.delivery.courier.user.lastName}`
            : '—',
      },
      {
        header: 'Aksiyon',
        cell: ({ row }) => (
          <Link className="text-amber-700" href={`/orders/${row.original.id}`}>
            Detay
          </Link>
        ),
      },
    ],
    [],
  );

  return (
    <PageSection title="Siparişler" description="Sunucu tarafı pagination ve kontrollü polling kullanılır.">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <label className="text-sm">
          Durum
          <select
            className="ml-2 rounded-2xl border px-3 py-2"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
          >
            <option value="">Tümü</option>
            {STATUS_FILTER_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <PollingNote seconds={15} />
      </div>
      {loading ? (
        <LoadingState label="Siparişler yükleniyor…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <>
          <DataTable data={rows} columns={cols} />
          <div className="flex items-center justify-between text-sm">
            <span>Toplam {meta?.total ?? 0}</span>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Önceki
              </button>
              <span>
                {page}/{meta?.totalPages ?? 1}
              </span>
              <button type="button" disabled={page >= (meta?.totalPages ?? 1)} onClick={() => setPage((p) => p + 1)}>
                Sonraki
              </button>
            </div>
          </div>
        </>
      )}
    </PageSection>
  );
}
