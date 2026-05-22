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
import {
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
  adminTextareaClass,
} from '../shared/admin-form-controls';

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
      await adminFetch(`/reviews/${selected.id}/reject`, {
        method: 'PATCH',
        body: JSON.stringify(v),
      });
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
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-xl border border-tertiary/25 bg-tertiary-container px-3 py-2 text-xs font-semibold text-tertiary transition hover:scale-[1.02] active:scale-[0.98]"
              onClick={() => void approve(row.original.id)}
            >
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              Onayla
            </button>
            <button
              type="button"
              className={adminSecondaryButtonClass}
              onClick={() => setSelected(row.original)}
            >
              <span className="material-symbols-outlined text-[16px]">cancel</span>
              Reddet
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-xl border border-error/25 bg-error-container px-3 py-2 text-xs font-semibold text-error transition hover:scale-[1.02] active:scale-[0.98]"
              onClick={() => void remove(row.original.id)}
            >
              <span className="material-symbols-outlined text-[16px]">delete</span>
              Sil
            </button>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <PageSection
      title="Yorum Moderasyonu"
      description="Müşteri yorumlarını onaylayın, gerekçeli reddedin veya uygunsuz kayıtları kaldırın."
    >
      {loading ? (
        <LoadingState label="Yorumlar yükleniyor…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <div className="space-y-stack-md">
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryTile icon="rate_review" label="Bekleyen yorum" value={rows.length} />
            <SummaryTile
              icon="star"
              label="Ortalama puan"
              value={
                rows.length
                  ? (rows.reduce((sum, row) => sum + row.rating, 0) / rows.length).toFixed(1)
                  : '0'
              }
            />
            <SummaryTile icon="schedule" label="Yenileme" value="20 sn" />
          </div>

          <div className="flex flex-col gap-3 rounded-card border border-outline-variant/35 bg-surface-container-lowest p-4 shadow-bakery sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-on-surface">Moderasyon kuyruğu</h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                Yayına alınmayı bekleyen ürün yorumları listelenir.
              </p>
            </div>
            <PollingNote seconds={20} />
          </div>

          <DataTable data={rows} columns={cols} empty="Bekleyen yorum bulunamadı." />
        </div>
      )}
      {selected ? (
        <form
          className="space-y-4 rounded-card border border-outline-variant/35 bg-surface-container-lowest p-6 shadow-bakery"
          onSubmit={form.handleSubmit(reject)}
        >
          <div className="flex items-center gap-2 border-b border-outline-variant/35 pb-3">
            <span className="material-symbols-outlined text-[22px] text-chocolate">
              rate_review
            </span>
            <h2 className="font-display text-xl font-semibold text-on-surface">Yorum reddet</h2>
          </div>
          <Field label="Neden" error={form.formState.errors.reason?.message}>
            <textarea className={adminTextareaClass} {...form.register('reason')} />
          </Field>
          <button className={adminPrimaryButtonClass} type="submit">
            <span className="material-symbols-outlined text-[20px]">cancel</span>
            Reddet
          </button>
        </form>
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
