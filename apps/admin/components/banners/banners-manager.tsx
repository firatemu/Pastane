'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm, type FieldErrors, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { adminFetch } from '../../lib/api/catalog';
import { adminMessageFromUnknownError } from '../../lib/messages/admin-facing-errors';
import {
  bannerFormSchema,
  toIsoDateInput,
  type AdminBanner,
  type BannerFormValues,
} from '../../lib/banners/schemas';
import { can } from '../../lib/permissions/can';
import { ErrorState, LoadingState } from '../shared/async-state';
import {
  adminInputClass,
  adminPrimaryButtonClass,
  adminSelectClass,
} from '../shared/admin-form-controls';
import { BannersStatsBar } from './banners-stats-bar';
import { BannersList } from './banners-list';
import { BannerDetailModal } from './banner-detail-modal';
import { BannerFormSheet } from './banner-form-sheet';

type UploadBannerResponse = {
  variant: string;
  url: string;
  bucket: string;
  objectKey: string;
  detectedMediaType: 'IMAGE' | 'VIDEO';
  mime: string;
};

function collectValidationMessages(errors: FieldErrors): string[] {
  const messages: string[] = [];
  const queue: unknown[] = [errors];
  while (queue.length) {
    const current = queue.shift();
    if (!current || typeof current !== 'object') continue;
    const c = current as Record<string, unknown>;
    if (typeof c.message === 'string' && c.message.length > 0) messages.push(c.message);
    if (c.types && typeof c.types === 'object') {
      for (const t of Object.values(c.types as Record<string, unknown>)) {
        if (typeof t === 'string' && t.length > 0) messages.push(t);
      }
    }
    for (const [key, val] of Object.entries(c)) {
      if (key === 'message' || key === 'type' || key === 'ref' || key === 'types') continue;
      if (val !== null && typeof val === 'object') queue.push(val);
    }
  }
  return [...new Set(messages)];
}

export function BannersManager({ permissions }: { permissions: string[] }): React.JSX.Element {
  const [rows, setRows] = useState<AdminBanner[]>([]);
  const [selected, setSelected] = useState<AdminBanner | null>(null);
  const [editing, setEditing] = useState<AdminBanner | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [formValidationHints, setFormValidationHints] = useState<string[]>([]);
  const [desktopMeta, setDesktopMeta] = useState<{ bucket: string; objectKey: string } | null>(
    null,
  );
  const [mobileMeta, setMobileMeta] = useState<{ bucket: string; objectKey: string } | null>(null);

  // Filters State
  const [search, setSearch] = useState('');
  const [mediaTypeFilter, setMediaTypeFilter] = useState<'ALL' | 'IMAGE' | 'VIDEO'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PASSIVE'>('ALL');

  const form = useForm<BannerFormValues>({
    resolver: zodResolver(bannerFormSchema) as Resolver<BannerFormValues>,
    defaultValues: {
      title: '',
      subtitle: '',
      description: '',
      mediaType: 'IMAGE',
      buttonText: '',
      buttonUrl: '',
      sortOrder: 0,
      isActive: true,
      startsAt: '',
      endsAt: '',
      desktopMediaUrl: '',
      mobileMediaUrl: '',
    },
  });

  const mediaType = form.watch('mediaType');
  const desktopMediaUrl = form.watch('desktopMediaUrl');
  const mobileMediaUrl = form.watch('mobileMediaUrl');

  async function load(): Promise<void> {
    try {
      setListError(null);
      const data = await adminFetch<AdminBanner[]>('/banners');
      setRows(data);
    } catch (caught) {
      setListError(adminMessageFromUnknownError(caught, 'Banner verileri yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function uploadSlot(slot: 'desktop' | 'mobile', file: File | null): Promise<void> {
    if (!file) return;
    try {
      setUploadErr(null);
      const body = new FormData();
      body.set('file', file);
      body.set('variant', slot);
      body.set('expectKind', mediaType);
      const res = await adminFetch<UploadBannerResponse>('/banners/upload', {
        method: 'POST',
        body,
      });
      if (res.detectedMediaType !== mediaType) {
        setUploadErr('Yüklenen dosya seçilen medya tipi ile uyuşmuyor.');
        return;
      }
      if (slot === 'desktop') {
        setDesktopMeta({ bucket: res.bucket, objectKey: res.objectKey });
        form.setValue('desktopMediaUrl', res.url, { shouldValidate: true });
      } else {
        setMobileMeta({ bucket: res.bucket, objectKey: res.objectKey });
        form.setValue('mobileMediaUrl', res.url, { shouldValidate: true });
      }
    } catch (caught) {
      setUploadErr(adminMessageFromUnknownError(caught, 'Yükleme başarısız.'));
    }
  }

  function buildPayload(values: BannerFormValues) {
    return {
      title: values.title,
      subtitle: values.subtitle || undefined,
      description: values.description || undefined,
      mediaType: values.mediaType,
      desktopMediaUrl: values.desktopMediaUrl,
      desktopMediaBucket: desktopMeta?.bucket ?? editing?.desktopMediaBucket ?? undefined,
      desktopMediaObjectKey: desktopMeta?.objectKey ?? editing?.desktopMediaObjectKey ?? undefined,
      mobileMediaUrl: values.mobileMediaUrl,
      mobileMediaBucket: mobileMeta?.bucket ?? editing?.mobileMediaBucket ?? undefined,
      mobileMediaObjectKey: mobileMeta?.objectKey ?? editing?.mobileMediaObjectKey ?? undefined,
      buttonText: values.buttonText || undefined,
      buttonUrl: values.buttonUrl || undefined,
      sortOrder: values.sortOrder,
      isActive: values.isActive,
      startsAt: values.startsAt ? new Date(values.startsAt).toISOString() : undefined,
      endsAt: values.endsAt ? new Date(values.endsAt).toISOString() : undefined,
    };
  }

  async function submit(values: BannerFormValues): Promise<void> {
    try {
      setSaveError(null);
      setFormValidationHints([]);
      const body = buildPayload(values);
      if (editing) {
        await adminFetch<AdminBanner>(`/banners/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
      } else {
        await adminFetch<AdminBanner>('/banners', { method: 'POST', body: JSON.stringify(body) });
      }
      setEditing(null);
      setDesktopMeta(null);
      setMobileMeta(null);
      setFormOpen(false);
      form.reset({
        title: '',
        subtitle: '',
        description: '',
        mediaType: 'IMAGE',
        buttonText: '',
        buttonUrl: '',
        sortOrder: 0,
        isActive: true,
        startsAt: '',
        endsAt: '',
        desktopMediaUrl: '',
        mobileMediaUrl: '',
      });
      await load();
    } catch (caught) {
      setSaveError(adminMessageFromUnknownError(caught, 'Banner kaydedilemedi.'));
    }
  }

  async function toggleActive(row: AdminBanner): Promise<void> {
    try {
      setSaveError(null);
      await adminFetch(`/banners/${row.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !row.isActive }),
      });
      await load();
    } catch (caught) {
      setSaveError(adminMessageFromUnknownError(caught, 'Durum güncellenemedi.'));
    }
  }

  async function remove(row: AdminBanner): Promise<void> {
    if (!window.confirm('Bu banner öğesini silmek istediğinize emin misiniz?')) return;
    try {
      setSaveError(null);
      await adminFetch(`/banners/${row.id}`, { method: 'DELETE' });
      await load();
      if (selected?.id === row.id) {
        setSelected(null);
      }
    } catch (caught) {
      setSaveError(adminMessageFromUnknownError(caught, 'Silme işlemi başarısız oldu.'));
    }
  }

  async function move(from: number, to: number): Promise<void> {
    if (to < 0 || to >= rows.length || from < 0 || from >= rows.length) return;
    const next = [...rows];
    const [item] = next.splice(from, 1);
    if (item === undefined) return;
    next.splice(to, 0, item);
    try {
      setSaveError(null);
      await adminFetch('/banners/reorder', {
        method: 'PATCH',
        body: JSON.stringify({ ids: next.map((r) => r.id) }),
      });
      await load();
    } catch (caught) {
      setSaveError(adminMessageFromUnknownError(caught, 'Sıra güncellenemedi.'));
    }
  }

  function startAdd(): void {
    setEditing(null);
    setDesktopMeta(null);
    setMobileMeta(null);
    setFormValidationHints([]);
    setUploadErr(null);
    form.reset({
      title: '',
      subtitle: '',
      description: '',
      mediaType: 'IMAGE',
      buttonText: '',
      buttonUrl: '',
      sortOrder: 0,
      isActive: true,
      startsAt: '',
      endsAt: '',
      desktopMediaUrl: '',
      mobileMediaUrl: '',
    });
    setFormOpen(true);
  }

  function startEdit(row: AdminBanner): void {
    setDesktopMeta(null);
    setMobileMeta(null);
    setFormValidationHints([]);
    setUploadErr(null);
    setEditing(row);
    form.reset({
      title: row.title,
      subtitle: row.subtitle ?? '',
      description: row.description ?? '',
      mediaType: row.mediaType,
      buttonText: row.buttonText ?? '',
      buttonUrl: row.buttonUrl ?? '',
      sortOrder: row.sortOrder,
      isActive: row.isActive,
      startsAt: toIsoDateInput(row.startsAt),
      endsAt: toIsoDateInput(row.endsAt),
      desktopMediaUrl: row.desktopMediaUrl,
      mobileMediaUrl: row.mobileMediaUrl,
    });
    setFormOpen(true);
  }

  // Filtered rows
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesSearch =
        row.title.toLowerCase().includes(search.toLowerCase()) ||
        (row.subtitle && row.subtitle.toLowerCase().includes(search.toLowerCase()));

      const matchesMediaType = mediaTypeFilter === 'ALL' || row.mediaType === mediaTypeFilter;

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && row.isActive) ||
        (statusFilter === 'PASSIVE' && !row.isActive);

      return matchesSearch && matchesMediaType && matchesStatus;
    });
  }, [rows, search, mediaTypeFilter, statusFilter]);

  const canSubmit = can(permissions, ['banners.create', 'banners.update']);

  if (loading) {
    return <LoadingState label="Bannerlar yükleniyor…" />;
  }

  if (listError) {
    return <ErrorState message={listError} />;
  }

  return (
    <section className="space-y-stack-md">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-on-surface">
          Ana Sayfa Bannerları
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-on-surface-variant">
          Masaüstü ve mobil görsel veya kısa videolar. Zamanlama ve sıralama vitrinde doğrudan
          yansır.
        </p>
      </header>

      {/* Stats Bar */}
      <BannersStatsBar banners={rows} />

      {/* Save Error Alert */}
      {saveError && (
        <div className="rounded-2xl border border-error/20 bg-error-container/45 px-4 py-3 text-sm text-error font-medium">
          {saveError}
        </div>
      )}

      {/* Horizontal Search & Filter Bar */}
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
                placeholder="Başlık veya alt başlığa göre ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </label>
          <label className="block space-y-1.5 text-sm font-medium text-on-surface">
            <span className="text-on-surface-variant">Medya</span>
            <select
              className={adminSelectClass}
              value={mediaTypeFilter}
              onChange={(e) => setMediaTypeFilter(e.target.value as 'ALL' | 'IMAGE' | 'VIDEO')}
            >
              <option value="ALL">Hepsi</option>
              <option value="IMAGE">Görsel</option>
              <option value="VIDEO">Video</option>
            </select>
          </label>
          <label className="block space-y-1.5 text-sm font-medium text-on-surface">
            <span className="text-on-surface-variant">Durum</span>
            <select
              className={adminSelectClass}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'PASSIVE')}
            >
              <option value="ALL">Hepsi</option>
              <option value="ACTIVE">Aktif</option>
              <option value="PASSIVE">Pasif</option>
            </select>
          </label>
        </div>
        {canSubmit && (
          <button
            type="button"
            className={`${adminPrimaryButtonClass} shrink-0`}
            onClick={startAdd}
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            Yeni banner
          </button>
        )}
      </div>

      {/* Interactive List Table */}
      <BannersList
        banners={filteredRows}
        selectedId={selected?.id ?? null}
        onSelect={setSelected}
        onEdit={startEdit}
        onToggleActive={toggleActive}
        onRemove={remove}
        onMove={move}
        canEdit={can(permissions, ['banners.update'])}
        canDelete={can(permissions, ['banners.delete'])}
        canReorder={can(permissions, ['banners.reorder'])}
      />

      {/* Detail Overlay Modal */}
      <BannerDetailModal
        banner={selected}
        permissions={permissions}
        onEdit={() => {
          if (selected) {
            setSelected(null);
            startEdit(selected);
          }
        }}
        onClose={() => setSelected(null)}
      />

      {/* Slide-over Form Sheet */}
      <BannerFormSheet
        open={formOpen}
        editing={editing}
        form={form}
        mediaType={mediaType}
        desktopMediaUrl={desktopMediaUrl}
        mobileMediaUrl={mobileMediaUrl}
        uploadErr={uploadErr}
        formValidationHints={formValidationHints}
        uploadSlot={uploadSlot}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSubmit={form.handleSubmit(
          async (values: BannerFormValues) => {
            await submit(values);
          },
          (errs) => {
            const msgs = collectValidationMessages(errs);
            setFormValidationHints(
              msgs.length > 0
                ? msgs
                : ['Doğrulama başarısız. Zorunlu alanları ve dosya yüklemelerini kontrol edin.'],
            );
          },
        )}
      />
    </section>
  );
}
