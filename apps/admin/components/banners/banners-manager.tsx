'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm, type FieldErrors, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ColumnDef } from '@tanstack/react-table';
import { adminFetch } from '../../lib/api/catalog';
import { adminMessageFromUnknownError } from '../../lib/messages/admin-facing-errors';
import { bannerFormSchema, formatSchedule, toIsoDateInput, type AdminBanner, type BannerFormValues } from '../../lib/banners/schemas';
import { can } from '../../lib/permissions/can';
import { DataTable } from '../shared/data-table';
import { Field } from '../shared/form-field';
import { PageSection } from '../shared/page-section';
import { ErrorState, LoadingState } from '../shared/async-state';

type UploadBannerResponse = {
  variant: string;
  url: string;
  bucket: string;
  objectKey: string;
  detectedMediaType: 'IMAGE' | 'VIDEO';
  mime: string;
};

/** Zod 4 / nested FieldErrors: collect human-readable messages for the alert box. */
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
  const [editing, setEditing] = useState<AdminBanner | null>(null);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [formValidationHints, setFormValidationHints] = useState<string[]>([]);
  const [desktopMeta, setDesktopMeta] = useState<{ bucket: string; objectKey: string } | null>(null);
  const [mobileMeta, setMobileMeta] = useState<{ bucket: string; objectKey: string } | null>(null);
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
      const res = await adminFetch<UploadBannerResponse>('/banners/upload', { method: 'POST', body });
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
      await adminFetch('/banners/reorder', { method: 'PATCH', body: JSON.stringify({ ids: next.map((r) => r.id) }) });
      await load();
    } catch (caught) {
      setSaveError(adminMessageFromUnknownError(caught, 'Sıra güncellenemedi.'));
    }
  }

  function startEdit(row: AdminBanner): void {
    setDesktopMeta(null);
    setMobileMeta(null);
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
  }

  const columns = useMemo<ColumnDef<AdminBanner>[]>(
    () => [
      {
        header: 'Önizleme',
        cell: ({ row }) =>
          row.original.mediaType === 'IMAGE' ? (
            <img alt="" className="h-12 w-20 rounded-lg object-cover" src={row.original.desktopMediaUrl} />
          ) : (
            <video className="h-12 w-20 rounded-lg object-cover" muted playsInline src={row.original.desktopMediaUrl} />
          ),
      },
      { header: 'Medya', accessorKey: 'mediaType' },
      { header: 'Başlık', accessorKey: 'title' },
      {
        header: 'Aktif',
        cell: ({ row }) => (row.original.isActive ? 'Evet' : 'Hayır'),
      },
      {
        header: 'Zamanlama',
        cell: ({ row }) => formatSchedule(row.original),
      },
      { header: 'Sıra', accessorKey: 'sortOrder' },
      {
        header: 'Sırayı değiştir',
        cell: ({ row }) =>
          can(permissions, ['banners.reorder']) ? (
            <div className="flex gap-1">
              <button type="button" className="rounded border px-2 py-1 text-xs" onClick={() => move(row.index, row.index - 1)}>
                ↑
              </button>
              <button type="button" className="rounded border px-2 py-1 text-xs" onClick={() => move(row.index, row.index + 1)}>
                ↓
              </button>
            </div>
          ) : null,
      },
      {
        header: 'Aksiyon',
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-2">
            {can(permissions, ['banners.update']) ? (
              <button type="button" className="text-amber-700" onClick={() => void toggleActive(row.original)}>
                {row.original.isActive ? 'Pasifleştir' : 'Aktifleştir'}
              </button>
            ) : null}
            {can(permissions, ['banners.update']) ? (
              <button type="button" className="text-amber-700" onClick={() => startEdit(row.original)}>
                Düzenle
              </button>
            ) : null}
            {can(permissions, ['banners.delete']) ? (
              <button type="button" className="text-red-700" onClick={() => void remove(row.original)}>
                Sil
              </button>
            ) : null}
          </div>
        ),
      },
    ],
    [permissions, rows],
  );

  const canSubmit = can(permissions, ['banners.create', 'banners.update']);

  return (
    <PageSection
      title="Ana sayfa bannerları"
      description="Masaüstü ve mobil görsel veya kısa video. Zamanlama ve sıra vitrinde doğrudan yansır."
    >
      {loading ? (
        <LoadingState label="Bannerlar yükleniyor…" />
      ) : listError ? (
        <ErrorState message={listError} />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
          {saveError ? (
            <div className="xl:col-span-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{saveError}</div>
          ) : null}
          <DataTable data={rows} columns={columns} />
          {canSubmit ? (
            <form
              className="space-y-4 rounded-3xl border bg-white p-5"
              onSubmit={form.handleSubmit(
                async (values: BannerFormValues) => {
                  await submit(values);
                },
                (errs) => {
                  const msgs = collectValidationMessages(errs);
                  setFormValidationHints(msgs.length > 0 ? msgs : ['Doğrulama başarısız. Zorunlu alanları ve dosya yüklemelerini kontrol edin.']);
                },
              )}
            >
              <h2 className="font-semibold">{editing ? 'Banner düzenle' : 'Yeni banner'}</h2>
              {formValidationHints.length > 0 ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
                  <p className="font-medium">Kayıt için eksik veya hatalı alanlar:</p>
                  <ul className="mt-1 list-inside list-disc">
                    {formValidationHints.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-red-700">
                    Masaüstü ve mobil dosyaların her ikisini de yüklemeniz gerekir (yükleme yapılmadan Kaydet çalışmaz).
                  </p>
                </div>
              ) : null}
              {uploadErr ? <p className="text-sm text-red-700">{uploadErr}</p> : null}
              <Field label="Başlık" error={form.formState.errors.title?.message}>
                <input className="w-full rounded-2xl border px-3 py-2" {...form.register('title')} />
              </Field>
              <Field label="Alt başlık" error={form.formState.errors.subtitle?.message}>
                <input className="w-full rounded-2xl border px-3 py-2" {...form.register('subtitle')} />
              </Field>
              <Field label="Açıklama" error={form.formState.errors.description?.message}>
                <textarea className="w-full rounded-2xl border px-3 py-2" rows={3} {...form.register('description')} />
              </Field>
              <Field label="Medya tipi" error={form.formState.errors.mediaType?.message}>
                <select className="w-full rounded-2xl border px-3 py-2" {...form.register('mediaType')}>
                  <option value="IMAGE">Görsel</option>
                  <option value="VIDEO">Video</option>
                </select>
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-sm">
                  Masaüstü dosya
                  <input
                    type="file"
                    accept={mediaType === 'IMAGE' ? 'image/*' : 'video/mp4,video/webm'}
                    onChange={(e) => void uploadSlot('desktop', e.target.files?.[0] ?? null)}
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  Mobil dosya
                  <input
                    type="file"
                    accept={mediaType === 'IMAGE' ? 'image/*' : 'video/mp4,video/webm'}
                    onChange={(e) => void uploadSlot('mobile', e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
              <input type="hidden" {...form.register('desktopMediaUrl')} />
              <input type="hidden" {...form.register('mobileMediaUrl')} />
              <p className="text-xs text-stone-500">
                Yükleme sonrası alanlar otomatik dolar. Desteklenen görseller: JPEG, PNG, WebP, GIF (maks. 5MB). Video: MP4 veya WebM (maks. 20MB).
              </p>
              <Field label="Buton metni" error={form.formState.errors.buttonText?.message}>
                <input className="w-full rounded-2xl border px-3 py-2" {...form.register('buttonText')} />
              </Field>
              <Field label="Buton bağlantısı" error={form.formState.errors.buttonUrl?.message}>
                <input className="w-full rounded-2xl border px-3 py-2" {...form.register('buttonUrl')} />
              </Field>
              <Field label="Sıra" error={form.formState.errors.sortOrder?.message}>
                <input type="number" className="w-full rounded-2xl border px-3 py-2" {...form.register('sortOrder', { valueAsNumber: true })} />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...form.register('isActive')} />
                Aktif
              </label>
              <Field label="Başlangıç (isteğe bağlı)" error={form.formState.errors.startsAt?.message}>
                <input type="datetime-local" className="w-full rounded-2xl border px-3 py-2" {...form.register('startsAt')} />
              </Field>
              <Field label="Bitiş (isteğe bağlı)" error={form.formState.errors.endsAt?.message}>
                <input type="datetime-local" className="w-full rounded-2xl border px-3 py-2" {...form.register('endsAt')} />
              </Field>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={form.formState.isSubmitting}
                  className="rounded-2xl bg-stone-900 px-4 py-2 text-white disabled:opacity-50"
                >
                  {form.formState.isSubmitting ? 'Kaydediliyor…' : 'Kaydet'}
                </button>
                {editing ? (
                  <button
                    type="button"
                    className="rounded-2xl border px-4 py-2"
                    onClick={() => {
                      setEditing(null);
                      setDesktopMeta(null);
                      setMobileMeta(null);
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
                    }}
                  >
                    İptal
                  </button>
                ) : null}
              </div>
            </form>
          ) : null}
        </div>
      )}
    </PageSection>
  );
}
