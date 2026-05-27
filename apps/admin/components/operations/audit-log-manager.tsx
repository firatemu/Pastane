'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { adminFetch } from '../../lib/api/catalog';
import {
  AUDIT_TONE_STYLES,
  formatAuditDateTime,
  formatAuditRelativeTime,
  getAuditPresentation,
  type AuditChange,
  type AuditPresentation,
  type AuditTone,
} from '../../lib/operations/audit-presentation';
import { adminMessageFromUnknownError } from '../../lib/messages/admin-facing-errors';
import type { AuditLogRow } from '../../lib/operations/types';
import { DataTable } from '../shared/data-table';
import { adminSelectClass } from '../shared/admin-form-controls';
import { PageSection } from '../shared/page-section';
import { ErrorState, LoadingState } from '../shared/async-state';

type AuditTableRow = {
  raw: AuditLogRow;
  presentation: AuditPresentation;
};

const TONE_FILTER_OPTIONS: Array<{ value: 'ALL' | AuditTone; label: string }> = [
  { value: 'ALL', label: 'Tümü' },
  { value: 'info', label: 'Bilgi' },
  { value: 'success', label: 'Başarılı' },
  { value: 'warning', label: 'Dikkat' },
  { value: 'danger', label: 'Kritik' },
  { value: 'neutral', label: 'Diğer' },
];

export function AuditLogManager(): React.JSX.Element {
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState<'ALL' | string>('ALL');
  const [toneFilter, setToneFilter] = useState<'ALL' | AuditTone>('ALL');

  const load = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      setRows(await adminFetch<AuditLogRow[]>('/audit'));
    } catch (e) {
      setError(adminMessageFromUnknownError(e, 'Denetim kayıtları yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const preparedRows = useMemo<AuditTableRow[]>(
    () => rows.map((row) => ({ raw: row, presentation: getAuditPresentation(row) })),
    [rows],
  );

  const entityOptions = useMemo(
    () =>
      Array.from(
        new Map(
          preparedRows.map(({ raw, presentation }) => [raw.entityType, presentation.entityLabel] as const),
        ).entries(),
      ),
    [preparedRows],
  );

  const summary = useMemo(
    () => ({
      issueCount: preparedRows.filter(
        ({ presentation }) => presentation.tone === 'warning' || presentation.tone === 'danger',
      ).length,
      systemCount: preparedRows.filter(({ raw }) => !raw.actorId).length,
      userCount: preparedRows.filter(({ raw }) => Boolean(raw.actorId)).length,
    }),
    [preparedRows],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('tr');

    return preparedRows.filter(({ raw, presentation }) => {
      if (entityFilter !== 'ALL' && raw.entityType !== entityFilter) {
        return false;
      }

      if (toneFilter !== 'ALL' && presentation.tone !== toneFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        presentation.title,
        presentation.description,
        presentation.entityLabel,
        presentation.entityReference,
        getAuditChangeSummary({ raw, presentation }),
        presentation.actorLabel,
        presentation.actorDetail,
      ].some((value) => value.toLocaleLowerCase('tr').includes(query));
    });
  }, [entityFilter, preparedRows, search, toneFilter]);

  const hasActiveFilters =
    search.trim().length > 0 || entityFilter !== 'ALL' || toneFilter !== 'ALL';

  const columns = useMemo<ColumnDef<AuditTableRow>[]>(
    () => [
      {
        header: 'Zaman',
        cell: ({ row }) => (
          <p className="min-w-[220px] whitespace-nowrap text-sm text-on-surface">
            <span className="font-medium">{formatAuditDateTime(row.original.raw.createdAt)}</span>
            <span className="ml-2 text-xs text-on-surface-variant">
              {formatAuditRelativeTime(row.original.raw.createdAt)}
            </span>
          </p>
        ),
      },
      {
        header: 'Olay',
        cell: ({ row }) => {
          const { presentation } = row.original;

          return (
            <div className="flex min-w-[240px] items-center gap-2 whitespace-nowrap">
              <AuditToneBadge label={presentation.toneLabel} tone={presentation.tone} />
              <p className="font-semibold text-on-surface">{presentation.title}</p>
            </div>
          );
        },
      },
      {
        header: 'Kaynak türü',
        cell: ({ row }) => {
          const { presentation } = row.original;

          return (
            <p className="min-w-[140px] whitespace-nowrap font-medium text-on-surface">
              {presentation.entityLabel}
            </p>
          );
        },
      },
      {
        header: 'Kayıt',
        cell: ({ row }) => {
          const { presentation } = row.original;

          return (
            <p className="min-w-[220px] whitespace-nowrap text-sm text-on-surface-variant">
              {presentation.entityReference}
            </p>
          );
        },
      },
      {
        header: 'Değişiklik özeti',
        cell: ({ row }) => {
          return (
            <p className="min-w-[360px] whitespace-nowrap text-sm text-on-surface-variant">
              {getAuditChangeSummary(row.original)}
            </p>
          );
        },
      },
      {
        header: 'İşlemi yapan',
        cell: ({ row }) => {
          const { presentation } = row.original;

          return (
            <p className="min-w-[240px] whitespace-nowrap text-sm text-on-surface-variant">
              <span className="font-medium text-on-surface">{presentation.actorLabel}</span>
              <span className="mx-2 text-outline">•</span>
              <span>{presentation.actorDetail}</span>
            </p>
          );
        },
      },
    ],
    [],
  );

  return (
    <PageSection
      title="Denetim kayıtları"
      description="Son 200 kaydı tek satırda olay, kaynak, değişiklik özeti ve işlemi yapan bilgisiyle takip edin."
    >
      {loading ? (
        <LoadingState label="Kayıtlar yükleniyor…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <div className="space-y-stack-md">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryTile icon="history" label="Toplam kayıt" value={rows.length} />
            <SummaryTile
              icon="warning"
              label="Dikkat gerektiren"
              value={summary.issueCount}
            />
            <SummaryTile
              icon="person"
              label="Kullanıcı işlemi"
              value={summary.userCount}
            />
            <SummaryTile
              icon="memory"
              label="Sistem işlemi"
              value={summary.systemCount}
            />
          </div>

          <div className="grid gap-3 rounded-card border border-outline-variant/35 bg-surface-container-lowest p-4 shadow-bakery lg:grid-cols-[minmax(0,1.8fr),minmax(0,1fr),minmax(0,1fr)]">
            <label className="block space-y-1.5 text-sm font-medium text-on-surface">
              <span className="text-on-surface-variant">Ara</span>
              <div className="relative">
                <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-outline">
                  search
                </span>
                <input
                  className="w-full rounded-xl border border-outline-variant/60 bg-surface-container-lowest px-3 py-2.5 pl-10 text-[15px] text-on-surface outline-none transition placeholder:text-outline focus:border-secondary/50 focus:ring-2 focus:ring-secondary-container"
                  placeholder="Olay, kaynak veya açıklama ara…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </label>

            <label className="block space-y-1.5 text-sm font-medium text-on-surface">
              <span className="text-on-surface-variant">Kaynak türü</span>
              <select
                className={adminSelectClass}
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
              >
                <option value="ALL">Tümü</option>
                {entityOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5 text-sm font-medium text-on-surface">
              <span className="text-on-surface-variant">Önem</span>
              <select
                className={adminSelectClass}
                value={toneFilter}
                onChange={(e) => setToneFilter(e.target.value as 'ALL' | AuditTone)}
              >
                {TONE_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <p className="text-sm text-on-surface-variant">
            {hasActiveFilters
              ? `${filtered.length} / ${rows.length} kayıt filtreyle eşleşiyor`
              : `${rows.length} kayıt tek satırlık özetlerle listeleniyor`}
          </p>

          <DataTable
            data={filtered}
            columns={columns}
            empty={
              hasActiveFilters
                ? 'Seçilen filtrelerle eşleşen denetim kaydı bulunamadı.'
                : 'Denetim kaydı bulunamadı.'
            }
          />
        </div>
      )}
    </PageSection>
  );
}

function SummaryTile({
  icon,
  label,
  value,
}: Readonly<{ icon: string; label: string; value: number | string }>): React.JSX.Element {
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

function AuditToneBadge({
  tone,
  label,
}: Readonly<{ tone: AuditTone; label: string }>): React.JSX.Element {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${AUDIT_TONE_STYLES[tone]}`}
    >
      {label}
    </span>
  );
}

function getAuditChangeSummary(item: AuditTableRow): string {
  const changeSummary = item.presentation.changes.map((change) => formatChangeDetail(change)).join(' • ');

  if (item.presentation.extraChangeCount > 0) {
    return changeSummary
      ? `${changeSummary} • +${item.presentation.extraChangeCount} alan daha`
      : `+${item.presentation.extraChangeCount} alan daha`;
  }

  if (changeSummary) {
    return changeSummary;
  }

  return 'Öne çıkan alan değişikliği yok';
}

function formatChangeDetail(change: AuditChange): string {
  if (change.key === 'ids') {
    return 'Seçili kayıtlar güncellendi';
  }

  if (change.key.endsWith('Id')) {
    if (change.previousValue && change.nextValue) {
      return `${change.label} bilgisi güncellendi`;
    }

    if (change.nextValue) {
      return `${change.label} bilgisi eklendi`;
    }

    if (change.previousValue) {
      return `${change.label} bilgisi kaldırıldı`;
    }
  }

  if (change.previousValue && change.nextValue) {
    return `${change.label}: ${change.previousValue} -> ${change.nextValue}`;
  }

  if (change.nextValue) {
    return `${change.label}: ${change.nextValue}`;
  }

  if (change.previousValue) {
    return `${change.label}: ${change.previousValue} (kaldırıldı)`;
  }

  return 'Detay yok';
}
