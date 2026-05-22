'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { adminFetch } from '../../lib/api/catalog';
import { adminMessageFromUnknownError } from '../../lib/messages/admin-facing-errors';
import type { AuditLogRow } from '../../lib/operations/types';
import { DataTable } from '../shared/data-table';
import { PageSection } from '../shared/page-section';
import { ErrorState, LoadingState } from '../shared/async-state';

export function AuditLogManager(): React.JSX.Element {
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  async function load(): Promise<void> {
    try {
      setError(null);
      setRows(await adminFetch<AuditLogRow[]>('/audit'));
    } catch (e) {
      setError(adminMessageFromUnknownError(e, 'Denetim kayıtları yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const columns = useMemo<ColumnDef<AuditLogRow>[]>(
    () => [
      {
        header: 'Zaman (UTC)',
        cell: ({ row }) =>
          new Date(row.original.createdAt).toISOString().replace('T', ' ').slice(0, 19),
      },
      { header: 'Aksiyon', accessorKey: 'action' },
      { header: 'Varlık', accessorKey: 'entityType' },
      { header: 'Varlık ID', accessorKey: 'entityId' },
      { header: 'Aktör', accessorKey: 'actorId' },
    ],
    [],
  );

  const filtered = rows.filter((row) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [row.action, row.entityType, row.entityId, row.actorId]
      .filter(Boolean)
      .some((value) => value?.toLowerCase().includes(q));
  });

  return (
    <PageSection
      title="Denetim kayıtları"
      description="Operasyon panelindeki son hareketleri aksiyon, varlık ve aktör bilgisiyle izleyin."
    >
      {loading ? (
        <LoadingState label="Kayıtlar yükleniyor…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <div className="space-y-stack-md">
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryTile icon="history" label="Toplam kayıt" value={rows.length} />
            <SummaryTile
              icon="category"
              label="Varlık türü"
              value={new Set(rows.map((row) => row.entityType)).size}
            />
            <SummaryTile
              icon="person"
              label="Aktör"
              value={new Set(rows.map((row) => row.actorId).filter(Boolean)).size}
            />
          </div>

          <div className="flex flex-col gap-3 rounded-card border border-outline-variant/35 bg-surface-container-lowest p-4 shadow-bakery sm:flex-row sm:items-end">
            <label className="block grow space-y-1.5 text-sm font-medium text-on-surface">
              <span className="text-on-surface-variant">Ara</span>
              <div className="relative">
                <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-outline">
                  search
                </span>
                <input
                  className="w-full rounded-xl border border-outline-variant/60 bg-surface-container-lowest px-3 py-2.5 pl-10 text-[15px] text-on-surface outline-none transition placeholder:text-outline focus:border-secondary/50 focus:ring-2 focus:ring-secondary-container"
                  placeholder="Aksiyon, varlık veya aktör…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </label>
          </div>

          <p className="text-sm text-on-surface-variant">
            {filtered.length === rows.length
              ? `${rows.length} kayıt listeleniyor`
              : `${filtered.length} / ${rows.length} kayıt (filtreli)`}
          </p>

          <DataTable data={filtered} columns={columns} empty="Denetim kaydı bulunamadı." />
        </div>
      )}
    </PageSection>
  );
}

function SummaryTile({
  icon,
  label,
  value,
}: Readonly<{ icon: string; label: string; value: number }>): React.JSX.Element {
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
