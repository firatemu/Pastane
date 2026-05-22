'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { storeSchema } from '../../lib/catalog/schemas';
import type { Store } from '../../lib/catalog/types';
import { adminFetch, adminFetchEnvelope } from '../../lib/api/catalog';
import { adminMessageFromUnknownError } from '../../lib/messages/admin-facing-errors';
import { can } from '../../lib/permissions/can';
import { ErrorState, LoadingState } from '../shared/async-state';
import { Field } from '../shared/form-field';
import {
  adminInputClass,
  adminTextareaClass,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
} from '../shared/admin-form-controls';

type Form = z.input<typeof storeSchema>;

const emptyForm: Form = {
  name: '',
  phone: '',
  city: '',
  district: '',
  address: '',
  latitude: '',
  longitude: '',
  isActive: true,
};

export function StoresManager({ permissions }: { permissions: string[] }): React.JSX.Element {
  const [rows, setRows] = useState<Store[]>([]);
  const [selected, setSelected] = useState<Store | null>(null);
  const [editing, setEditing] = useState<Store | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');

  const form = useForm<Form>({
    resolver: zodResolver(storeSchema),
    defaultValues: emptyForm,
  });

  const canSubmit = can(permissions, ['settings.update']);

  async function load(): Promise<void> {
    try {
      setError(null);
      const data = (await adminFetchEnvelope<Store[]>('/stores?limit=100')).data;
      setRows(data);
      setSelected((prev) => (prev ? (data.find((store) => store.id === prev.id) ?? null) : null));
    } catch (caught) {
      setError(adminMessageFromUnknownError(caught, 'Mağazalar yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const cities = useMemo(
    () =>
      [...new Set(rows.map((row) => row.city).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, 'tr'),
      ),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((store) => {
      if (statusFilter === 'ACTIVE' && !store.isActive) return false;
      if (statusFilter === 'INACTIVE' && store.isActive) return false;
      if (cityFilter && store.city !== cityFilter) return false;
      if (!q) return true;
      return [store.name, store.phone ?? '', store.city, store.district, store.address]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [cityFilter, rows, search, statusFilter]);

  async function submit(values: Form): Promise<void> {
    try {
      setError(null);
      const saved = await adminFetch<Store>(`/stores${editing ? `/${editing.id}` : ''}`, {
        method: editing ? 'PATCH' : 'POST',
        body: JSON.stringify({
          ...values,
          latitude: values.latitude === '' ? undefined : values.latitude,
          longitude: values.longitude === '' ? undefined : values.longitude,
        }),
      });
      setSelected(saved);
      setEditing(null);
      setFormOpen(false);
      form.reset(emptyForm);
      await load();
    } catch (caught) {
      setError(adminMessageFromUnknownError(caught, 'Mağaza kaydedilemedi.'));
    }
  }

  async function toggleActive(row: Store): Promise<void> {
    try {
      setError(null);
      await adminFetch(`/stores/${row.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !row.isActive }),
      });
      await load();
    } catch (caught) {
      setError(adminMessageFromUnknownError(caught, 'Mağaza durumu güncellenemedi.'));
    }
  }

  function openCreate(): void {
    setEditing(null);
    form.reset(emptyForm);
    setFormOpen(true);
  }

  function openEdit(store: Store): void {
    setSelected(null);
    setEditing(store);
    form.reset({
      name: store.name,
      phone: store.phone ?? '',
      city: store.city,
      district: store.district,
      address: store.address,
      latitude: store.latitude ?? '',
      longitude: store.longitude ?? '',
      isActive: store.isActive,
    });
    setFormOpen(true);
  }

  function closeForm(): void {
    setFormOpen(false);
    setEditing(null);
    form.reset(emptyForm);
  }

  return (
    <section className="space-y-stack-md">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-on-surface">
          Mağazalar
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-on-surface-variant">
          Şubelerinizi arayın, filtreleyin ve detay panelinden adres, iletişim ve koordinat
          bilgilerini yönetin.
        </p>
      </header>

      {loading ? (
        <LoadingState label="Mağazalar yükleniyor…" />
      ) : error && rows.length === 0 ? (
        <ErrorState message={error} />
      ) : (
        <div className="space-y-stack-md">
          {error ? <ErrorState message={error} /> : null}

          <StoresStatsBar stores={rows} />

          <div className="flex flex-col gap-3 rounded-card border border-outline-variant/35 bg-surface-container-lowest p-4 shadow-bakery lg:flex-row lg:items-end lg:justify-between">
            <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="block space-y-1.5 text-sm font-medium text-on-surface">
                <span className="text-on-surface-variant">Ara</span>
                <div className="relative">
                  <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-outline">
                    search
                  </span>
                  <input
                    className={`${adminInputClass} pl-10`}
                    placeholder="Ad, telefon, ilçe veya adres…"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
              </label>
              <label className="block space-y-1.5 text-sm font-medium text-on-surface">
                <span className="text-on-surface-variant">Şehir</span>
                <select
                  className={adminInputClass}
                  value={cityFilter}
                  onChange={(event) => setCityFilter(event.target.value)}
                >
                  <option value="">Tümü</option>
                  {cities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1.5 text-sm font-medium text-on-surface">
                <span className="text-on-surface-variant">Durum</span>
                <select
                  className={adminInputClass}
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option value="">Tümü</option>
                  <option value="ACTIVE">Aktif</option>
                  <option value="INACTIVE">Pasif</option>
                </select>
              </label>
            </div>
            {canSubmit ? (
              <button
                type="button"
                className={`${adminPrimaryButtonClass} shrink-0`}
                onClick={openCreate}
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
                Yeni mağaza
              </button>
            ) : null}
          </div>

          <p className="text-sm text-on-surface-variant">
            {filtered.length === rows.length
              ? `${rows.length} mağaza listeleniyor`
              : `${filtered.length} / ${rows.length} mağaza (filtreli)`}
          </p>

          <StoresList
            stores={filtered}
            selectedId={selected?.id ?? null}
            onSelect={setSelected}
            onEdit={openEdit}
            onToggleActive={toggleActive}
            canEdit={canSubmit}
          />
        </div>
      )}

      <StoreDetailModal
        store={selected}
        canEdit={canSubmit}
        onClose={() => setSelected(null)}
        onEdit={() => {
          if (selected) openEdit(selected);
        }}
      />

      {canSubmit ? (
        <StoreFormSheet
          open={formOpen}
          editing={editing}
          form={form}
          onClose={closeForm}
          onSubmit={submit}
        />
      ) : null}
    </section>
  );
}

function StoresStatsBar({ stores }: Readonly<{ stores: Store[] }>): React.JSX.Element {
  const active = stores.filter((store) => store.isActive).length;
  const withCoords = stores.filter((store) => store.latitude && store.longitude).length;
  const districts = new Set(stores.map((store) => `${store.city}/${store.district}`)).size;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard icon="storefront" label="Toplam mağaza" value={stores.length} />
      <StatCard icon="check_circle" label="Aktif mağaza" value={active} />
      <StatCard icon="location_on" label="Bölge" value={districts} />
      <StatCard icon="my_location" label="Koordinatlı" value={withCoords} />
    </div>
  );
}

function StoresList({
  stores,
  selectedId,
  onSelect,
  onEdit,
  onToggleActive,
  canEdit,
}: Readonly<{
  stores: Store[];
  selectedId: string | null;
  onSelect: (store: Store) => void;
  onEdit: (store: Store) => void;
  onToggleActive: (store: Store) => void | Promise<void>;
  canEdit: boolean;
}>): React.JSX.Element {
  if (!stores.length) {
    return (
      <div className="rounded-card border border-dashed border-outline-variant/60 bg-surface-container-lowest p-10 text-center shadow-bakery">
        <span className="material-symbols-outlined text-[44px] text-outline">storefront</span>
        <p className="mt-3 font-semibold text-on-surface">Mağaza bulunamadı</p>
        <p className="mt-1 text-sm text-on-surface-variant">
          Filtreleri temizleyerek tekrar deneyin.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 xl:grid-cols-2">
      {stores.map((store) => {
        const selected = selectedId === store.id;
        return (
          <button
            key={store.id}
            type="button"
            className={`group rounded-card border p-4 text-left shadow-bakery transition hover:-translate-y-0.5 ${
              selected
                ? 'border-secondary bg-secondary-container/45'
                : 'border-outline-variant/35 bg-surface-container-lowest hover:bg-surface-container-low'
            }`}
            onClick={() => onSelect(store)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-chocolate/10 text-chocolate">
                  <span className="material-symbols-outlined text-[24px]">storefront</span>
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold text-on-surface">{store.name}</h2>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    {store.city} / {store.district}
                  </p>
                </div>
              </div>
              <StatusPill active={store.isActive} />
            </div>
            <p className="mt-4 line-clamp-2 text-sm leading-6 text-on-surface-variant">
              {store.address}
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-on-surface-variant">
                <span className="material-symbols-outlined text-[15px] text-outline">call</span>
                {store.phone || 'Telefon yok'}
              </span>
              {canEdit ? (
                <span className="flex gap-1.5">
                  <span
                    role="button"
                    tabIndex={0}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant/60 bg-surface-container-lowest text-on-surface-variant transition hover:text-chocolate"
                    title={store.isActive ? 'Pasifleştir' : 'Aktifleştir'}
                    onClick={(event) => {
                      event.stopPropagation();
                      void onToggleActive(store);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.stopPropagation();
                        void onToggleActive(store);
                      }
                    }}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {store.isActive ? 'visibility_off' : 'visibility'}
                    </span>
                  </span>
                  <span
                    role="button"
                    tabIndex={0}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant/60 bg-surface-container-lowest text-on-surface-variant transition hover:text-chocolate"
                    title="Düzenle"
                    onClick={(event) => {
                      event.stopPropagation();
                      onEdit(store);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.stopPropagation();
                        onEdit(store);
                      }
                    }}
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </span>
                </span>
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function StoreDetailModal({
  store,
  canEdit,
  onClose,
  onEdit,
}: Readonly<{
  store: Store | null;
  canEdit: boolean;
  onClose: () => void;
  onEdit: () => void;
}>): React.JSX.Element | null {
  if (!store) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-chocolate/35 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[1.75rem] border border-outline-variant/35 bg-surface-container-lowest shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-outline-variant/35 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-outline">
              Mağaza detayı
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-on-surface">
              {store.name}
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              {store.city} / {store.district}
            </p>
          </div>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant/60 text-on-surface-variant"
            onClick={onClose}
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <InfoBlock icon="location_on" label="Adres" value={store.address} wide />
          <InfoBlock icon="call" label="Telefon" value={store.phone || 'Telefon yok'} />
          <InfoBlock icon="my_location" label="Koordinat" value={coordsLabel(store)} />
          <InfoBlock icon="toggle_on" label="Durum" value={store.isActive ? 'Aktif' : 'Pasif'} />
        </div>
        {canEdit ? (
          <div className="flex justify-end gap-2 border-t border-outline-variant/35 p-5">
            <button type="button" className={adminSecondaryButtonClass} onClick={onClose}>
              Kapat
            </button>
            <button type="button" className={adminPrimaryButtonClass} onClick={onEdit}>
              <span className="material-symbols-outlined text-[20px]">edit</span>
              Düzenle
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StoreFormSheet({
  open,
  editing,
  form,
  onClose,
  onSubmit,
}: Readonly<{
  open: boolean;
  editing: Store | null;
  form: ReturnType<typeof useForm<Form>>;
  onClose: () => void;
  onSubmit: (values: Form) => Promise<void>;
}>): React.JSX.Element | null {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-chocolate/30 backdrop-blur-sm">
      <form
        className="h-full w-full max-w-xl overflow-y-auto bg-surface-container-lowest p-6 shadow-2xl"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="mb-6 flex items-start justify-between gap-4 border-b border-outline-variant/35 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-outline">
              {editing ? 'Mağaza düzenle' : 'Yeni mağaza'}
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-on-surface">
              {editing ? editing.name : 'Mağaza bilgileri'}
            </h2>
          </div>
          <button type="button" className={adminSecondaryButtonClass} onClick={onClose}>
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <div className="space-y-4">
          <Field label="Mağaza adı" error={form.formState.errors.name?.message}>
            <input
              className={adminInputClass}
              placeholder="Örn: Kadıköy Şubesi"
              {...form.register('name')}
            />
          </Field>
          <Field label="Telefon" error={form.formState.errors.phone?.message}>
            <input
              className={adminInputClass}
              placeholder="Örn: 0216 123 4567"
              {...form.register('phone')}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Şehir" error={form.formState.errors.city?.message}>
              <input
                className={adminInputClass}
                placeholder="İstanbul"
                {...form.register('city')}
              />
            </Field>
            <Field label="İlçe" error={form.formState.errors.district?.message}>
              <input
                className={adminInputClass}
                placeholder="Kadıköy"
                {...form.register('district')}
              />
            </Field>
          </div>
          <Field label="Açık adres" error={form.formState.errors.address?.message}>
            <textarea className={adminTextareaClass} rows={4} {...form.register('address')} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Enlem" error={form.formState.errors.latitude?.message}>
              <input
                className={adminInputClass}
                placeholder="40.9901"
                {...form.register('latitude')}
              />
            </Field>
            <Field label="Boylam" error={form.formState.errors.longitude?.message}>
              <input
                className={adminInputClass}
                placeholder="29.0289"
                {...form.register('longitude')}
              />
            </Field>
          </div>
          <label className="flex items-center justify-between rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-3 text-sm font-semibold text-on-surface">
            Aktif şube / siparişe açık
            <input
              type="checkbox"
              className="h-5 w-5 rounded border-outline-variant/60 text-chocolate focus:ring-secondary/50"
              {...form.register('isActive')}
            />
          </label>
        </div>
        <div className="mt-6 flex gap-2 border-t border-outline-variant/35 pt-4">
          <button
            className={`${adminPrimaryButtonClass} flex-1`}
            type="submit"
            disabled={form.formState.isSubmitting}
          >
            <span className="material-symbols-outlined text-[20px]">
              {form.formState.isSubmitting ? 'progress_activity' : 'save'}
            </span>
            {form.formState.isSubmitting ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
          <button type="button" className={adminSecondaryButtonClass} onClick={onClose}>
            İptal
          </button>
        </div>
      </form>
    </div>
  );
}

function StatusPill({ active }: Readonly<{ active: boolean }>): React.JSX.Element {
  return active ? (
    <span className="inline-flex items-center gap-1 rounded-full border border-tertiary/25 bg-tertiary-container px-2.5 py-0.5 text-xs font-semibold text-tertiary">
      <span className="material-symbols-outlined text-[14px]">check_circle</span>
      Aktif
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full border border-outline-variant/35 bg-surface-container px-2.5 py-0.5 text-xs font-semibold text-on-surface-variant">
      <span className="material-symbols-outlined text-[14px]">cancel</span>
      Pasif
    </span>
  );
}

function InfoBlock({
  icon,
  label,
  value,
  wide,
}: Readonly<{ icon: string; label: string; value: string; wide?: boolean }>): React.JSX.Element {
  return (
    <div
      className={`rounded-xl border border-outline-variant/35 bg-surface-container-low p-4 ${wide ? 'sm:col-span-2' : ''}`}
    >
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-outline">
        <span className="material-symbols-outlined text-[16px]">{icon}</span>
        {label}
      </div>
      <p className="mt-2 text-sm font-medium leading-6 text-on-surface">{value}</p>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: Readonly<{ icon: string; label: string; value: number }>): React.JSX.Element {
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

function coordsLabel(store: Store): string {
  return store.latitude && store.longitude
    ? `${store.latitude}, ${store.longitude}`
    : 'Koordinat yok';
}
