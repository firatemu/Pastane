'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { adminFetch } from '../../lib/api/catalog';
import { adminMessageFromUnknownError } from '../../lib/messages/admin-facing-errors';
import { can } from '../../lib/permissions/can';
import { createCampaignSchema, updateCampaignSchema } from '../../lib/operations/schemas';
import type { CampaignRow } from '../../lib/operations/types';
import { ErrorState, LoadingState } from '../shared/async-state';
import {
  adminInputClass,
  adminPrimaryButtonClass,
  adminSelectClass,
} from '../shared/admin-form-controls';
import { CampaignsStatsBar } from './campaigns-stats-bar';
import { CampaignsList } from './campaigns-list';
import { CampaignDetailModal } from './campaign-detail-modal';
import { CampaignFormSheet } from './campaign-form-sheet';

type CreateForm = z.infer<typeof createCampaignSchema>;
type UpdateForm = z.infer<typeof updateCampaignSchema>;

export function CampaignsManager({ permissions }: { permissions: string[] }): React.JSX.Element {
  const [rows, setRows] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<CampaignRow | null>(null);
  const [editing, setEditing] = useState<CampaignRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'PERCENT' | 'FIXED'>('ALL');

  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createCampaignSchema) as Resolver<CreateForm>,
    defaultValues: {
      name: '',
      description: '',
      type: 'PERCENT',
      value: 0,
      status: 'ACTIVE',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: '',
    },
  });

  const editForm = useForm<UpdateForm>({
    resolver: zodResolver(updateCampaignSchema) as Resolver<UpdateForm>,
    defaultValues: {},
  });

  async function load(): Promise<void> {
    try {
      setError(null);
      setRows(await adminFetch<CampaignRow[]>('/campaigns'));
    } catch (e) {
      setError(adminMessageFromUnknownError(e, 'Kampanyalar yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function startAdd(): void {
    setEditing(null);
    createForm.reset({
      name: '',
      description: '',
      type: 'PERCENT',
      value: 0,
      status: 'ACTIVE',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: '',
    });
    setFormOpen(true);
  }

  function startEdit(row: CampaignRow): void {
    setEditing(row);
    editForm.reset({
      name: row.name,
      description: row.description ?? '',
      type: row.type,
      value: Number(row.value),
      status: row.status as 'ACTIVE' | 'INACTIVE',
      startDate: row.startDate.slice(0, 10),
      endDate: row.endDate ? row.endDate.slice(0, 10) : '',
    });
    setFormOpen(true);
  }

  async function submitCreate(v: CreateForm): Promise<void> {
    try {
      setError(null);
      await adminFetch('/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          ...v,
          endDate: v.endDate || undefined,
          description: v.description || undefined,
        }),
      });
      setFormOpen(false);
      createForm.reset({
        name: '',
        description: '',
        type: 'PERCENT',
        value: 0,
        status: 'ACTIVE',
        startDate: new Date().toISOString().slice(0, 10),
        endDate: '',
      });
      await load();
    } catch (e) {
      setError(adminMessageFromUnknownError(e, 'Kampanya oluşturulamadı.'));
    }
  }

  async function submitEdit(v: UpdateForm): Promise<void> {
    if (!editing) return;
    try {
      setError(null);
      const body = {
        ...v,
        endDate: v.endDate === '' ? null : v.endDate,
        description: v.description === '' ? null : v.description,
      };
      await adminFetch(`/campaigns/${editing.id}`, { method: 'PATCH', body: JSON.stringify(body) });
      setEditing(null);
      setFormOpen(false);
      await load();
    } catch (e) {
      setError(adminMessageFromUnknownError(e, 'Kampanya güncellenemedi.'));
    }
  }

  async function removeRow(row: CampaignRow): Promise<void> {
    if (!window.confirm(`"${row.name}" kampanyasını pasifleştirmek istiyor musunuz?`)) return;
    try {
      setError(null);
      await adminFetch(`/campaigns/${row.id}`, { method: 'DELETE' });
      await load();
      if (selected?.id === row.id) setSelected(null);
    } catch (e) {
      setError(adminMessageFromUnknownError(e, 'Kampanya pasifleştirilemedi.'));
    }
  }

  const activeRows = useMemo(() => rows.filter((r) => !r.deletedAt), [rows]);

  const filteredRows = useMemo(() => {
    return activeRows.filter((row) => {
      const matchesSearch =
        row.name.toLowerCase().includes(search.toLowerCase()) ||
        (row.description && row.description.toLowerCase().includes(search.toLowerCase()));
      const matchesStatus = statusFilter === 'ALL' || row.status === statusFilter;
      const matchesType = typeFilter === 'ALL' || row.type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [activeRows, search, statusFilter, typeFilter]);

  const activeForm = editing ? editForm : createForm;
  const activeSubmit = editing
    ? editForm.handleSubmit(submitEdit)
    : createForm.handleSubmit(submitCreate);

  if (loading) return <LoadingState label="Kampanyalar yükleniyor…" />;

  return (
    <section className="space-y-stack-md">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-on-surface">
          Kampanyalar
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-on-surface-variant">
          İndirim kampanyalarını oluşturun, düzenleyin ve yönetin. Yüzde veya sabit tutar bazlı
          indirimler tanımlayın.
        </p>
      </header>

      <CampaignsStatsBar campaigns={activeRows} />

      {error && (
        <div className="rounded-2xl border border-error/20 bg-error-container/45 px-4 py-3 text-sm text-error font-medium">
          {error}
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 rounded-card border border-outline-variant/35 bg-surface-container-lowest p-4 shadow-bakery lg:flex-row lg:items-end lg:justify-between">
        <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block space-y-1.5 text-sm font-medium text-on-surface">
            <span className="text-on-surface-variant">Ara</span>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-2.5 text-[20px] text-outline">
                search
              </span>
              <input
                className={`${adminInputClass} pl-11`}
                placeholder="Kampanya adı veya açıklamasına göre ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </label>
          <label className="block space-y-1.5 text-sm font-medium text-on-surface">
            <span className="text-on-surface-variant">Tür</span>
            <select
              className={adminSelectClass}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'ALL' | 'PERCENT' | 'FIXED')}
            >
              <option value="ALL">Hepsi</option>
              <option value="PERCENT">Yüzde</option>
              <option value="FIXED">Sabit</option>
            </select>
          </label>
          <label className="block space-y-1.5 text-sm font-medium text-on-surface">
            <span className="text-on-surface-variant">Durum</span>
            <select
              className={adminSelectClass}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
            >
              <option value="ALL">Hepsi</option>
              <option value="ACTIVE">Aktif</option>
              <option value="INACTIVE">Pasif</option>
            </select>
          </label>
        </div>
        {can(permissions, ['campaigns.create']) && (
          <button
            type="button"
            className={`${adminPrimaryButtonClass} shrink-0`}
            onClick={startAdd}
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            Yeni kampanya
          </button>
        )}
      </div>

      <CampaignsList
        campaigns={filteredRows}
        selectedId={selected?.id ?? null}
        onSelect={setSelected}
        onEdit={startEdit}
        onRemove={removeRow}
        canEdit={can(permissions, ['campaigns.update'])}
        canDelete={can(permissions, ['campaigns.delete'])}
      />

      <CampaignDetailModal
        campaign={selected}
        permissions={permissions}
        onEdit={() => {
          if (selected) {
            const row = selected;
            setSelected(null);
            startEdit(row);
          }
        }}
        onClose={() => setSelected(null)}
      />

      <CampaignFormSheet
        open={formOpen}
        editing={editing}
        form={activeForm}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSubmit={activeSubmit}
      />
    </section>
  );
}
