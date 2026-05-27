'use client';

import type { JSX, ReactNode } from 'react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { adminFetchEnvelope } from '../../lib/api/catalog';
import { adminMessageFromUnknownError } from '../../lib/messages/admin-facing-errors';
import { formatTry } from '../../lib/format/format-try';
import { DELIVERY_TYPE_LABELS, STATUS_LABELS } from '../../lib/operations/status';
import type { OrderListItem } from '../../lib/operations/types';
import { ErrorState, LoadingState } from '../shared/async-state';

/**
 * Mirrors Stitch dashboard “Son siparişler” strip with real API data when `orders.viewAll` is permitted.
 */
export function DashboardRecentOrders(): JSX.Element {
  const [rows, setRows] = useState<OrderListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<'loading' | 'ready'>('loading');

  async function load(): Promise<void> {
    try {
      setError(null);
      const q = new URLSearchParams({ page: '1', limit: '5' });
      const res = await adminFetchEnvelope<OrderListItem[]>(`/orders?${q}`);
      setRows(res.data ?? []);
      setPhase('ready');
    } catch (e) {
      setError(adminMessageFromUnknownError(e, 'Son siparişler yüklenemedi.'));
      setPhase('ready');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <section className="rounded-card border border-outline-variant/70 bg-surface-container-lowest p-4 shadow-bakery lg:col-span-2">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-on-surface-variant">Sipariş akışı</p>
          <h3 className="mt-1.5 text-lg font-semibold tracking-tight text-on-surface">Son siparişler</h3>
        </div>
        <Link
          className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/70 bg-surface-container-low px-3 py-1.5 text-[13px] font-semibold text-secondary transition hover:border-secondary/20 hover:bg-secondary-container/80"
          href="/orders"
        >
          Tümünü gör
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </Link>
      </div>
      {error ? (
        <ErrorState message={error} />
      ) : phase !== 'ready' ? (
        <LoadingState label="Son siparişler yükleniyor…" />
      ) : rows.length === 0 ? (
        <p className="text-sm text-on-surface-variant">Listelenecek sipariş bulunmadı.</p>
      ) : (
        <div className="-mx-4 overflow-x-auto px-4">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-b border-outline-variant/45">
                <TableHead>Sipariş</TableHead>
                <TableHead>Müşteri</TableHead>
                <TableHead>Teslim</TableHead>
                <TableHead>Tutar</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">Ayrıntı</TableHead>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20 text-sm">
              {rows.map((o) => (
                <tr className="group transition hover:bg-surface-container-low/60" key={o.id}>
                  <td className="py-3 pr-4 font-semibold text-on-surface">{o.orderNumber}</td>
                  <td className="py-3 pr-4 text-on-surface-variant">
                    {o.user.firstName} {o.user.lastName}
                  </td>
                  <td className="py-3 pr-4 text-on-surface-variant">{DELIVERY_TYPE_LABELS[o.deliveryType] ?? o.deliveryType}</td>
                  <td className="py-3 pr-4 font-medium text-on-surface">{formatTry(o.grandTotal)}</td>
                  <td className="py-3 pr-4">
                    <StatusPill tone={toneFor(o.status)} label={STATUS_LABELS[o.status] ?? o.status} />
                  </td>
                  <td className="py-3 text-right">
                    <Link
                      className="inline-flex items-center rounded-full border border-outline-variant/70 bg-surface-container-lowest px-2.5 py-1 text-secondary transition hover:border-secondary/20 hover:bg-secondary-container/80"
                      href={`/orders/${o.id}`}
                    >
                      <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function toneFor(status: OrderListItem['status']): StatusTone {
  if (status === 'PREPARING') return 'tertiary';
  if (status === 'OUT_FOR_DELIVERY' || status === 'ASSIGNED_TO_COURIER') return 'delivery';
  if (status === 'DELIVERY_FAILED') return 'danger';
  if (status === 'DELIVERED') return 'neutral';
  if (status === 'CANCELLED') return 'muted';
  return 'default';
}

type StatusTone = 'tertiary' | 'delivery' | 'neutral' | 'muted' | 'danger' | 'default';

function StatusPill({ label, tone }: Readonly<{ label: string; tone: StatusTone }>): JSX.Element {
  const cls =
    tone === 'tertiary'
      ? 'border border-tertiary/20 bg-tertiary-container text-tertiary'
      : tone === 'delivery'
        ? 'border border-secondary/20 bg-secondary-container text-secondary'
        : tone === 'danger'
          ? 'border border-error/35 bg-error-container text-error'
          : tone === 'neutral'
            ? 'border border-outline-variant/60 bg-surface-container text-on-surface'
            : tone === 'muted'
              ? 'border border-outline-variant/40 bg-surface-variant text-on-surface-variant'
              : 'border border-outline-variant/35 bg-primary-container text-on-surface';

  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${cls}`}>{label}</span>;
}

function TableHead({ children, className }: Readonly<{ children: ReactNode; className?: string }>): JSX.Element {
  return (
    <th className={`py-3 pr-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-on-surface-variant ${className ?? ''}`}>
      {children}
    </th>
  );
}
