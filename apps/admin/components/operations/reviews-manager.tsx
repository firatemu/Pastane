'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ColumnDef } from '@tanstack/react-table';
import type { z } from 'zod';
import { adminFetch, adminFetchEnvelope } from '../../lib/api/catalog';
import { adminMessageFromUnknownError } from '../../lib/messages/admin-facing-errors';
import { rejectReviewSchema } from '../../lib/operations/schemas';
import type { PendingReview } from '../../lib/operations/types';
import { DataTable } from '../shared/data-table';
import { PageSection } from '../shared/page-section';
import { PollingNote } from '../shared/polling-note';
import { ErrorState, LoadingState } from '../shared/async-state';
import { Field } from '../shared/form-field';

type Reject = z.input<typeof rejectReviewSchema>;

export function ReviewsManager(): React.JSX.Element {
  const [rows, setRows] = useState<PendingReview[]>([]);
  const [selected, setSelected] = useState<PendingReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<Reject>({
    resolver: zodResolver(rejectReviewSchema),
    defaultValues: { reason: '' },
  });

  async function load(): Promise<void> {
    try {
      setError(null);
      setRows((await adminFetchEnvelope<PendingReview[]>('/reviews/pending?limit=100')).data);
    } catch (e) {
      setError(adminMessageFromUnknownError(e, 'Yorum kuyruğu yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 20000);
    return () => clearInterval(id);
  }, []);

  async function approve(id: string): Promise<void> {
    try {
      await adminFetch(`/reviews/${id}/approve`, { method: 'PATCH' });
      await load();
    } catch (e) {
      setError(adminMessageFromUnknownError(e, 'Yorum onaylanamadı.'));
    }
  }

  async function reject(v: Reject): Promise<void> {
    if (!selected) return;
    try {
      await adminFetch(`/reviews/${selected.id}/reject`, { method: 'PATCH', body: JSON.stringify(v) });
      setSelected(null);
      form.reset();
      await load();
    } catch (e) {
      setError(adminMessageFromUnknownError(e, 'Yorum reddedilemedi.'));
    }
  }

  async function remove(id: string): Promise<void> {
    try {
      await adminFetch(`/reviews/${id}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      setError(adminMessageFromUnknownError(e, 'Yorum silinemedi.'));
    }
  }

  const cols = useMemo<ColumnDef<PendingReview>[]>(
    () => [
      { header: 'Ürün', cell: ({ row }) => row.original.product.name },
      {
        header: 'Müşteri',
        cell: ({ row }) => `${row.original.user.firstName} ${row.original.user.lastName}`,
      },
      { header: 'Puan', accessorKey: 'rating' },
      { header: 'Yorum', accessorKey: 'comment' },
      {
        header: 'Aksiyon',
        cell: ({ row }) => (
          <div className="flex gap-3">
            <button type="button" className="text-green-700" onClick={() => void approve(row.original.id)}>
              Onayla
            </button>
            <button type="button" className="text-amber-700" onClick={() => setSelected(row.original)}>
              Reddet
            </button>
            <button type="button" className="text-red-700" onClick={() => void remove(row.original.id)}>
              Sil
            </button>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <PageSection title="Yorum Moderasyonu">
      <PollingNote seconds={20} />
      {loading ? (
        <LoadingState label="Yorumlar yükleniyor…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <DataTable data={rows} columns={cols} />
      )}
      {selected ? (
        <form className="space-y-3 rounded-3xl border bg-white p-5" onSubmit={form.handleSubmit(reject)}>
          <h2 className="font-semibold">Yorum reddet</h2>
          <Field label="Neden" error={form.formState.errors.reason?.message}>
            <textarea className="w-full rounded-2xl border px-3 py-2" {...form.register('reason')} />
          </Field>
          <button className="rounded-2xl bg-stone-900 px-4 py-2 text-white" type="submit">
            Reddet
          </button>
        </form>
      ) : null}
    </PageSection>
  );
}
