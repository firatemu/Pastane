'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAdaptivePolling } from '@pastane/ui';
import type { AdaptivePollOutcome } from '@pastane/ui';
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
import { adminSecondaryButtonClass, adminSelectClass } from '../shared/admin-form-controls';
import { OrderReceiptPreview } from './order-receipt-preview';

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
  const [meta, setMeta] = useState<{ page: number; totalPages: number; total: number } | null>(
    null,
  );
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<OrderListItem | null>(null);

  const pollOrders = useCallback(async (): Promise<AdaptivePollOutcome> => {
    try {
      setError(null);
      const q = new URLSearchParams({ page: String(page), limit: '10' });
      if (status) q.set('status', status);
      const r = await adminFetchEnvelope<OrderListItem[]>(`/orders?${q}`);
      setRows(r.data);
      setMeta(r.meta as typeof meta);
      return 'ok';
    } catch (e) {
      setError(adminMessageFromUnknownError(e, 'Siparişler yüklenemedi.'));
      return 'error';
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    void pollOrders();
  }, [pollOrders]);

  useAdaptivePolling({ poll: pollOrders, immediate: false, baseIntervalMs: 15_000 });
  const cols = useMemo<ColumnDef<OrderListItem>[]>(
    () => [
      { header: 'No', accessorKey: 'orderNumber' },
      {
        header: 'Müşteri',
        cell: ({ row }) => `${row.original.user.firstName} ${row.original.user.lastName}`,
      },
      {
        header: 'Teslimat',
        cell: ({ row }) =>
          DELIVERY_TYPE_LABELS[row.original.deliveryType] ?? row.original.deliveryType,
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
          <div className="flex flex-wrap items-center gap-2">
            <Link className="font-semibold text-amber-700 underline-offset-2 hover:underline" href={`/orders/${row.original.id}`}>
              Detay
            </Link>
            <button
              className="inline-flex min-h-9 items-center gap-1 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-xs font-semibold text-on-surface transition hover:bg-secondary-container"
              type="button"
              onClick={() => setReceiptOrder(row.original)}
            >
              <span className="material-symbols-outlined text-[17px]">receipt_long</span>
              Fiş
            </button>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <PageSection
      title="Siparişler"
      description="Sipariş akışını canlı takip edin; durum filtresi ve sayfalama ile operasyon kuyruğunu yönetin."
    >
      {loading ? (
        <LoadingState label="Siparişler yükleniyor…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <div className="space-y-stack-md">
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryTile icon="shopping_bag" label="Toplam sipariş" value={meta?.total ?? 0} />
            <SummaryTile icon="view_list" label="Bu sayfa" value={rows.length} />
            <SummaryTile icon="schedule" label="Yenileme" value="15 sn" />
          </div>

          <div className="flex flex-col gap-3 rounded-card border border-outline-variant/35 bg-surface-container-lowest p-4 shadow-bakery sm:flex-row sm:items-end sm:justify-between">
            <label className="block w-full max-w-sm space-y-1.5 text-sm font-medium text-on-surface">
              <span className="text-on-surface-variant">Durum</span>
              <select
                className={adminSelectClass}
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

          <DataTable data={rows} columns={cols} />

          <div className="flex items-center justify-between rounded-card border border-outline-variant/35 bg-surface-container-lowest px-4 py-3 text-sm text-on-surface-variant shadow-bakery">
            <span>Toplam {meta?.total ?? 0}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={adminSecondaryButtonClass}
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Önceki
              </button>
              <span className="px-2 font-semibold text-on-surface">
                {page}/{meta?.totalPages ?? 1}
              </span>
              <button
                type="button"
                className={adminSecondaryButtonClass}
                disabled={page >= (meta?.totalPages ?? 1)}
                onClick={() => setPage((p) => p + 1)}
              >
                Sonraki
              </button>
            </div>
          </div>
        </div>
      )}
      {receiptOrder ? (
        <OrderReceiptPreview
          orderId={receiptOrder.id}
          summary={receiptOrder}
          onClose={() => setReceiptOrder(null)}
        />
      ) : null}
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
