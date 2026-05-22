'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';

import { adminFetch } from '../../lib/api/catalog';
import { adminMessageFromUnknownError } from '../../lib/messages/admin-facing-errors';
import type { AdminPermissionRow } from '../../lib/operations/types';
import { DataTable } from '../shared/data-table';
import { PageSection } from '../shared/page-section';
import { ErrorState, LoadingState } from '../shared/async-state';

export function PermissionsDirectory(): React.JSX.Element {
  const [rows, setRows] = useState<AdminPermissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load(): Promise<void> {
      try {
        setError(null);
        const data = await adminFetch<AdminPermissionRow[]>('/permissions');
        setRows(data);
      } catch (e) {
        setError(adminMessageFromUnknownError(e, 'İzinler yüklenemedi.'));
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const columns = useMemo<ColumnDef<AdminPermissionRow>[]>(
    () => [
      {
        header: 'Modül',
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/50 bg-surface-container px-2.5 py-0.5 text-xs font-semibold text-on-surface">
            <span className="material-symbols-outlined text-[14px] text-secondary">tune</span>
            {permissionModuleName(row.original.code)}
          </span>
        ),
      },
      {
        header: 'İzin kodu',
        cell: ({ row }) => <span className="font-mono text-sm">{row.original.code}</span>,
      },
      {
        header: 'Aksiyon',
        cell: ({ row }) => (
          <span className="text-sm text-on-surface-variant">
            {permissionActionName(row.original.code)}
          </span>
        ),
      },
    ],
    [],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => row.code.toLowerCase().includes(q));
  }, [rows, search]);

  const moduleCount = useMemo(
    () => new Set(rows.map((row) => permissionModuleName(row.code))).size,
    [rows],
  );

  return (
    <PageSection
      title="İzinler"
      description="Rol matrisinde kullanılan modül ve aksiyon bazlı izin kodlarını inceleyin."
    >
      {loading ? (
        <LoadingState label="İzinler yükleniyor…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <div className="space-y-stack-md">
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryTile icon="lock_person" label="Toplam izin" value={rows.length} />
            <SummaryTile icon="apps" label="Modül" value={moduleCount} />
            <SummaryTile icon="visibility" label="Erişim" value="Salt okunur" />
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
                  placeholder="Modül veya izin kodu…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </label>
          </div>

          <p className="text-sm text-on-surface-variant">
            {filtered.length === rows.length
              ? `${rows.length} izin listeleniyor`
              : `${filtered.length} / ${rows.length} izin (filtreli)`}
          </p>

          <DataTable data={filtered} columns={columns} empty="İzin kodu bulunamadı." />
        </div>
      )}
    </PageSection>
  );
}

function permissionModuleName(code: string): string {
  return code.split('.')[0] ?? code;
}

function permissionActionName(code: string): string {
  return code.split('.')[1] ?? '';
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
