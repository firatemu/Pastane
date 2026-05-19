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
        cell: ({ row }) => new Date(row.original.createdAt).toISOString().replace('T', ' ').slice(0, 19),
      },
      { header: 'Aksiyon', accessorKey: 'action' },
      { header: 'Varlık', accessorKey: 'entityType' },
      { header: 'Varlık ID', accessorKey: 'entityId' },
      { header: 'Aktör', accessorKey: 'actorId' },
    ],
    [],
  );

  return (
    <PageSection title="Denetim kayıtları" description="Son 200 kayıt (filtre API’de yok).">
      {loading ? <LoadingState label="Kayıtlar yükleniyor…" /> : error ? <ErrorState message={error} /> : <DataTable data={rows} columns={columns} />}
    </PageSection>
  );
}
