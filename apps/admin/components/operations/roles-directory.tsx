'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';

import { adminFetch } from '../../lib/api/catalog';
import { adminMessageFromUnknownError } from '../../lib/messages/admin-facing-errors';
import type { AdminRoleRow } from '../../lib/operations/types';
import { DataTable } from '../shared/data-table';
import { PageSection } from '../shared/page-section';
import { ErrorState, LoadingState } from '../shared/async-state';

export function RolesDirectory(): React.JSX.Element {
  const [rows, setRows] = useState<AdminRoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load(): Promise<void> {
      try {
        setError(null);
        const data = await adminFetch<AdminRoleRow[]>('/roles');
        setRows(
          [...data].sort((a, b) => a.name.localeCompare(b.name, 'tr', { sensitivity: 'base' })),
        );
      } catch (e) {
        setError(adminMessageFromUnknownError(e, 'Roller yüklenemedi.'));
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const columns = useMemo<ColumnDef<AdminRoleRow>[]>(
    () => [
      { header: 'Rol', accessorKey: 'name' },
      {
        header: 'Açıklama',
        cell: ({ row }) => row.original.description ?? '—',
      },
      {
        header: 'İzinler',
        cell: ({ row }) =>
          row.original.permissions
            .map((p) => p.permission.code)
            .sort((a, b) => a.localeCompare(b))
            .join(', ') || '—',
      },
    ],
    [],
  );

  return (
    <PageSection
      title="Roller"
      description="Salt okunur liste; izin atamaları veritabanı / seed üzerinden yönetilir."
    >
      {loading ? (
        <LoadingState label="Roller yükleniyor…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <DataTable data={rows} columns={columns} />
      )}
    </PageSection>
  );
}
