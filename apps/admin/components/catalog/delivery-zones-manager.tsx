'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { zoneSchema } from '../../lib/catalog/schemas';
import type { DeliveryZone } from '../../lib/catalog/types';
import { adminFetch, adminFetchEnvelope } from '../../lib/api/catalog';
import { adminMessageFromUnknownError } from '../../lib/messages/admin-facing-errors';
import { can } from '../../lib/permissions/can';
import { ErrorState, LoadingState } from '../shared/async-state';
import {
  adminInputClass,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
} from '../shared/admin-form-controls';
import { Field } from '../shared/form-field';

type Form = z.input<typeof zoneSchema>;

const emptyForm: Form = {
  name: '',
  minimumOrderPrice: '',
  deliveryFee: 0,
  estimatedMinutes: '',
  isActive: true,
};

export function DeliveryZonesManager({
  permissions,
}: {
  permissions: string[];
}): React.JSX.Element {
  const [rows, setRows] = useState<DeliveryZone[]>([]);
  const [selected, setSelected] = useState<DeliveryZone | null>(null);
  const [editing, setEditing] = useState<DeliveryZone | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [feeFilter, setFeeFilter] = useState('');

  const form = useForm<Form>({
    resolver: zodResolver(zoneSchema),
    defaultValues: emptyForm,
  });

  const canSubmit = can(permissions, ['settings.update']);

  async function load(): Promise<void> {
    try {
      setError(null);
      const data = (await adminFetchEnvelope<DeliveryZone[]>('/delivery-zones?limit=100')).data;
      setRows(data);
      setSelected((prev) => (prev ? (data.find((zone) => zone.id === prev.id) ?? null) : null));
    } catch (caught) {
      setError(adminMessageFromUnknownError(caught, 'Teslimat bölgeleri yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((zone) => {
      const fee = Number(zone.deliveryFee);
      if (statusFilter === 'ACTIVE' && !zone.isActive) return false;
      if (statusFilter === 'INACTIVE' && zone.isActive) return false;
      if (feeFilter === 'FREE' && fee !== 0) return false;
      if (feeFilter === 'PAID' && fee === 0) return false;
      if (!q) return true;
      return [
        zone.name,
        zone.minimumOrderPrice ? `minimum ${zone.minimumOrderPrice}` : 'sınır yok',
        fee === 0 ? 'ücretsiz' : zone.deliveryFee,
        zone.estimatedMinutes ? `${zone.estimatedMinutes} dakika` : '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [feeFilter, rows, search, statusFilter]);

  async function submit(values: Form): Promise<void> {
    try {
      setError(null);
      const saved = await adminFetch<DeliveryZone>(
        `/delivery-zones${editing ? `/${editing.id}` : ''}`,
        {
          method: editing ? 'PATCH' : 'POST',
          body: JSON.stringify({
            ...values,
            minimumOrderPrice:
              values.minimumOrderPrice === '' ? undefined : values.minimumOrderPrice,
            estimatedMinutes: values.estimatedMinutes === '' ? undefined : values.estimatedMinutes,
          }),
        },
      );
      setSelected(saved);
      setEditing(null);
      setFormOpen(false);
      form.reset(emptyForm);
      await load();
    } catch (caught) {
      setError(adminMessageFromUnknownError(caught, 'Teslimat bölgesi kaydedilemedi.'));
    }
  }

  async function toggleActive(row: DeliveryZone): Promise<void> {
    try {
      setError(null);
      await adminFetch(`/delivery-zones/${row.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !row.isActive }),
      });
      await load();
    } catch (caught) {
      setError(adminMessageFromUnknownError(caught, 'Bölge durumu güncellenemedi.'));
    }
  }

  function openCreate(): void {
    setEditing(null);
    form.reset(emptyForm);
    setFormOpen(true);
  }

  function openEdit(zone: DeliveryZone): void {
    setSelected(null);
    setEditing(zone);
    form.reset({
      name: zone.name,
      minimumOrderPrice: zone.minimumOrderPrice ? Number(zone.minimumOrderPrice) : '',
      deliveryFee: Number(zone.deliveryFee),
      estimatedMinutes: zone.estimatedMinutes ?? '',
      isActive: zone.isActive,
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
          Teslimat Bölgeleri
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-on-surface-variant">
          Dağıtım alanlarını arayın, filtreleyin ve detay panelinden minimum sepet, ücret ve süre
          ayarlarını yönetin.
        </p>
      </header>

      {loading ? (
        <LoadingState label="Teslimat bölgeleri yükleniyor…" />
      ) : error && rows.length === 0 ? (
        <ErrorState message={error} />
      ) : (
        <div className="space-y-stack-md">
          {error ? <ErrorState message={error} /> : null}

          <DeliveryZonesStatsBar zones={rows} />

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
                    placeholder="Bölge, ücret veya süre…"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
              </label>
              <label className="block space-y-1.5 text-sm font-medium text-on-surface">
                <span className="text-on-surface-variant">Ücret</span>
                <select
                  className={adminInputClass}
                  value={feeFilter}
                  onChange={(event) => setFeeFilter(event.target.value)}
                >
                  <option value="">Tümü</option>
                  <option value="FREE">Ücretsiz</option>
                  <option value="PAID">Ücretli</option>
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
                Yeni bölge
              </button>
            ) : null}
          </div>

          <p className="text-sm text-on-surface-variant">
            {filtered.length === rows.length
              ? `${rows.length} teslimat bölgesi listeleniyor`
              : `${filtered.length} / ${rows.length} teslimat bölgesi (filtreli)`}
          </p>

          <DeliveryZonesList
            zones={filtered}
            selectedId={selected?.id ?? null}
            onSelect={setSelected}
            onEdit={openEdit}
            onToggleActive={toggleActive}
            canEdit={canSubmit}
          />
        </div>
      )}

      <DeliveryZoneDetailModal
        zone={selected}
        canEdit={canSubmit}
        onClose={() => setSelected(null)}
        onEdit={() => {
          if (selected) openEdit(selected);
        }}
      />

      {canSubmit ? (
        <DeliveryZoneFormSheet
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

function DeliveryZonesStatsBar({ zones }: Readonly<{ zones: DeliveryZone[] }>): React.JSX.Element {
  const active = zones.filter((zone) => zone.isActive).length;
  const freeDelivery = zones.filter((zone) => Number(zone.deliveryFee) === 0).length;
  const timed = zones.filter((zone) => zone.estimatedMinutes).length;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard icon="map" label="Toplam bölge" value={zones.length} />
      <StatCard icon="check_circle" label="Aktif bölge" value={active} />
      <StatCard icon="redeem" label="Ücretsiz teslimat" value={freeDelivery} />
      <StatCard icon="schedule" label="Süre tanımlı" value={timed} />
    </div>
  );
}

function DeliveryZonesList({
  zones,
  selectedId,
  onSelect,
  onEdit,
  onToggleActive,
  canEdit,
}: Readonly<{
  zones: DeliveryZone[];
  selectedId: string | null;
  onSelect: (zone: DeliveryZone) => void;
  onEdit: (zone: DeliveryZone) => void;
  onToggleActive: (zone: DeliveryZone) => void | Promise<void>;
  canEdit: boolean;
}>): React.JSX.Element {
  if (!zones.length) {
    return (
      <div className="rounded-card border border-dashed border-outline-variant/60 bg-surface-container-lowest p-10 text-center shadow-bakery">
        <span className="material-symbols-outlined text-[44px] text-outline">map</span>
        <p className="mt-3 font-semibold text-on-surface">Teslimat bölgesi bulunamadı</p>
        <p className="mt-1 text-sm text-on-surface-variant">
          Filtreleri temizleyerek tekrar deneyin.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 xl:grid-cols-2">
      {zones.map((zone) => {
        const selected = selectedId === zone.id;
        const free = Number(zone.deliveryFee) === 0;
        return (
          <article
            key={zone.id}
            className={`rounded-card border p-4 shadow-bakery transition hover:-translate-y-0.5 ${
              selected
                ? 'border-secondary bg-secondary-container/45'
                : 'border-outline-variant/35 bg-surface-container-lowest hover:bg-surface-container-low'
            }`}
          >
            <button type="button" className="block w-full text-left" onClick={() => onSelect(zone)}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-chocolate/10 text-chocolate">
                    <span className="material-symbols-outlined text-[24px]">map</span>
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold text-on-surface">
                      {zone.name}
                    </h2>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      {zone.estimatedMinutes
                        ? `${zone.estimatedMinutes} dk teslimat`
                        : 'Süre belirtilmedi'}
                    </p>
                  </div>
                </div>
                <StatusPill active={zone.isActive} />
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <MiniMetric
                  icon="shopping_basket"
                  label="Minimum sepet"
                  value={moneyOrFreeLimit(zone.minimumOrderPrice)}
                />
                <MiniMetric
                  icon="payments"
                  label="Teslimat ücreti"
                  value={free ? 'Ücretsiz' : money(zone.deliveryFee)}
                />
              </div>
            </button>
            {canEdit ? (
              <div className="mt-4 flex justify-end gap-1.5">
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant/60 bg-surface-container-lowest text-on-surface-variant transition hover:text-chocolate"
                  title={zone.isActive ? 'Pasifleştir' : 'Aktifleştir'}
                  onClick={() => void onToggleActive(zone)}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {zone.isActive ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant/60 bg-surface-container-lowest text-on-surface-variant transition hover:text-chocolate"
                  title="Düzenle"
                  onClick={() => onEdit(zone)}
                >
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                </button>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

function DeliveryZoneDetailModal({
  zone,
  canEdit,
  onClose,
  onEdit,
}: Readonly<{
  zone: DeliveryZone | null;
  canEdit: boolean;
  onClose: () => void;
  onEdit: () => void;
}>): React.JSX.Element | null {
  if (!zone) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-chocolate/35 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[1.75rem] border border-outline-variant/35 bg-surface-container-lowest shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-outline-variant/35 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-outline">
              Teslimat bölgesi detayı
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-on-surface">
              {zone.name}
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              {zone.isActive ? 'Aktif dağıtım alanı' : 'Pasif dağıtım alanı'}
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
          <InfoBlock
            icon="shopping_basket"
            label="Minimum sepet"
            value={moneyOrFreeLimit(zone.minimumOrderPrice)}
          />
          <InfoBlock
            icon="payments"
            label="Teslimat ücreti"
            value={Number(zone.deliveryFee) === 0 ? 'Ücretsiz' : money(zone.deliveryFee)}
          />
          <InfoBlock
            icon="schedule"
            label="Tahmini süre"
            value={zone.estimatedMinutes ? `${zone.estimatedMinutes} dakika` : 'Belirtilmedi'}
          />
          <InfoBlock icon="toggle_on" label="Durum" value={zone.isActive ? 'Aktif' : 'Pasif'} />
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

function DeliveryZoneFormSheet({
  open,
  editing,
  form,
  onClose,
  onSubmit,
}: Readonly<{
  open: boolean;
  editing: DeliveryZone | null;
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
              {editing ? 'Bölge düzenle' : 'Yeni bölge'}
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-on-surface">
              {editing ? editing.name : 'Teslimat ayarları'}
            </h2>
          </div>
          <button type="button" className={adminSecondaryButtonClass} onClick={onClose}>
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="space-y-4">
          <Field label="Bölge adı" error={form.formState.errors.name?.message}>
            <input
              className={adminInputClass}
              placeholder="Örn: Kadıköy Merkez"
              {...form.register('name')}
            />
          </Field>
          <Field
            label="Minimum sepet tutarı (₺)"
            error={form.formState.errors.minimumOrderPrice?.message}
          >
            <input
              type="number"
              step="0.01"
              className={adminInputClass}
              placeholder="Örn: 150"
              {...form.register('minimumOrderPrice')}
            />
          </Field>
          <Field label="Teslimat ücreti (₺)" error={form.formState.errors.deliveryFee?.message}>
            <input
              type="number"
              step="0.01"
              className={adminInputClass}
              placeholder="Örn: 25"
              {...form.register('deliveryFee')}
            />
          </Field>
          <Field
            label="Tahmini teslim süresi (dakika)"
            error={form.formState.errors.estimatedMinutes?.message}
          >
            <input
              type="number"
              className={adminInputClass}
              placeholder="Örn: 30"
              {...form.register('estimatedMinutes')}
            />
          </Field>
          <label className="flex items-center justify-between rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-3 text-sm font-semibold text-on-surface">
            Aktif dağıtım alanı
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

function MiniMetric({
  icon,
  label,
  value,
}: Readonly<{ icon: string; label: string; value: string }>): React.JSX.Element {
  return (
    <div className="rounded-xl border border-outline-variant/35 bg-surface-container-low p-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-outline">
        <span className="material-symbols-outlined text-[15px]">{icon}</span>
        {label}
      </div>
      <p className="mt-1 text-sm font-semibold text-on-surface">{value}</p>
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
}: Readonly<{ icon: string; label: string; value: string }>): React.JSX.Element {
  return (
    <div className="rounded-xl border border-outline-variant/35 bg-surface-container-low p-4">
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

function money(value: string): string {
  return `₺${Number(value).toFixed(2)}`;
}

function moneyOrFreeLimit(value: string | null): string {
  return value ? money(value) : 'Sınır yok';
}
