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
    () => [{ header: 'Kod', accessorKey: 'code' }],
    [],
  );

  return (
    <PageSection
      title="İzinler"
      description="Sistemde tanımlı tüm izin kodları (salt okunur). Bazı kodlar henüz API rotasına bağlı olmayabilir."
    >
      {loading ? (
        <LoadingState label="İzinler yükleniyor…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <DataTable data={rows} columns={columns} />
      )}
    </PageSection>
  );
}
