'use client';

import { useEffect, useState } from 'react';
import { useForm, type Resolver, type UseFormRegisterReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { adminFetch } from '../../lib/api/catalog';
import { adminMessageFromUnknownError } from '../../lib/messages/admin-facing-errors';
import { can } from '../../lib/permissions/can';
import { settingKeyPatchSchema, systemSettingsSchema } from '../../lib/operations/schemas';
import type { SettingRow } from '../../lib/operations/types';
import { PageSection } from '../shared/page-section';
import { Field } from '../shared/form-field';
import { ErrorState, LoadingState } from '../shared/async-state';
import {
  adminInputClass,
  adminPrimaryButtonClass,
  adminTextareaClass,
} from '../shared/admin-form-controls';

type SystemForm = z.infer<typeof systemSettingsSchema>;
type KeyForm = z.infer<typeof settingKeyPatchSchema>;

function asBool(v: unknown): boolean {
  return Boolean(v);
}

export function SettingsManager({ permissions }: { permissions: string[] }): React.JSX.Element {
  const [rows, setRows] = useState<SettingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const systemForm = useForm<SystemForm>({
    resolver: zodResolver(systemSettingsSchema) as Resolver<SystemForm>,
    defaultValues: {},
  });

  const keyForm = useForm<KeyForm>({
    resolver: zodResolver(settingKeyPatchSchema) as Resolver<KeyForm>,
    defaultValues: { key: '', valueJson: '{}' },
  });

  async function load(): Promise<void> {
    try {
      setError(null);
      const [list, system] = await Promise.all([
        adminFetch<SettingRow[]>('/settings'),
        adminFetch<Record<string, unknown>>('/settings/system'),
      ]);
      setRows(list);
      systemForm.reset({
        otpActive: asBool(system.otpActive),
        deliveryActive: asBool(system.deliveryActive),
        pickupActive: asBool(system.pickupActive),
        loyaltyActive: asBool(system.loyaltyActive),
        paymentActive: asBool(system.paymentActive),
        minimumOrderValue: Number(system.minimumOrderValue ?? 0),
      });
    } catch (e) {
      setError(adminMessageFromUnknownError(e, 'Ayarlar yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function saveSystem(v: SystemForm): Promise<void> {
    setInfo(null);
    try {
      setError(null);
      await adminFetch('/settings/system/flags', {
        method: 'PATCH',
        body: JSON.stringify(v),
      });
      setInfo('Sistem bayrakları güncellendi.');
      await load();
    } catch (e) {
      setError(adminMessageFromUnknownError(e, 'Kaydetme işlemi başarısız oldu.'));
    }
  }

  async function saveKey(v: KeyForm): Promise<void> {
    setInfo(null);
    try {
      setError(null);
      const value = JSON.parse(v.valueJson) as unknown;
      await adminFetch(`/settings/${encodeURIComponent(v.key)}`, {
        method: 'PATCH',
        body: JSON.stringify({ value }),
      });
      setInfo(`Ayar anahtarı "${v.key}" güncellendi.`);
      keyForm.reset({ key: '', valueJson: '{}' });
      await load();
    } catch (e) {
      setError(adminMessageFromUnknownError(e, 'Geçersiz JSON veya kayıt hatası.'));
    }
  }

  if (loading) return <LoadingState label="Ayarlar yükleniyor…" />;

  const canUpdate = can(permissions, ['settings.update']);

  return (
    <PageSection
      title="Sistem ayarları"
      description="Sipariş, ödeme, sadakat ve bildirim davranışını belirleyen operasyon bayraklarını yönetin."
    >
      {error ? <ErrorState message={error} /> : null}
      {info ? (
        <div className="rounded-xl border border-tertiary/25 bg-tertiary-container px-4 py-3 text-sm font-medium text-tertiary">
          {info}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        <div className="space-y-stack-md">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryTile
              icon="toggle_on"
              label="Aktif bayrak"
              value={activeFlagCount(systemForm.getValues())}
            />
            <SummaryTile icon="settings" label="Kayıtlı anahtar" value={rows.length} />
            <SummaryTile
              icon="shopping_bag"
              label="Minimum sipariş"
              value={`₺${Number(systemForm.getValues('minimumOrderValue') ?? 0).toFixed(2)}`}
            />
            <SummaryTile
              icon="lock"
              label="Yönetim modu"
              value={canUpdate ? 'Açık' : 'Salt okunur'}
            />
          </div>

          <div className="rounded-card border border-outline-variant/35 bg-surface-container-lowest p-5 shadow-bakery">
            <div className="mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[22px] text-chocolate">database</span>
              <h2 className="font-display text-xl font-semibold text-on-surface">
                Tüm ayar kayıtları
              </h2>
            </div>
            <div className="space-y-2">
              {rows.map((r) => (
                <div
                  key={r.id}
                  className="rounded-xl border border-outline-variant/35 bg-surface-container-low px-3 py-3"
                >
                  <span className="font-mono text-sm font-semibold text-on-surface">{r.key}</span>
                  <pre className="mt-1 overflow-x-auto text-xs text-on-surface-variant">
                    {JSON.stringify(r.value, null, 0)}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        </div>

        {canUpdate ? (
          <div className="space-y-5">
            <form
              className="space-y-4 rounded-card border border-outline-variant/35 bg-surface-container-lowest p-6 shadow-bakery"
              onSubmit={systemForm.handleSubmit(saveSystem)}
            >
              <div className="flex items-center gap-2 border-b border-outline-variant/35 pb-3">
                <span className="material-symbols-outlined text-[22px] text-chocolate">tune</span>
                <h2 className="font-display text-xl font-semibold text-on-surface">
                  Sistem bayrakları
                </h2>
              </div>
              <div className="grid gap-2">
                <ToggleField label="OTP aktif" register={systemForm.register('otpActive')} />
                <ToggleField
                  label="Teslimat aktif"
                  register={systemForm.register('deliveryActive')}
                />
                <ToggleField label="Gel-al aktif" register={systemForm.register('pickupActive')} />
                <ToggleField
                  label="Sadakat aktif"
                  register={systemForm.register('loyaltyActive')}
                />
                <ToggleField label="Ödeme aktif" register={systemForm.register('paymentActive')} />
              </div>
              <Field
                label="Minimum sipariş tutarı"
                error={systemForm.formState.errors.minimumOrderValue?.message}
              >
                <input
                  type="number"
                  step="0.01"
                  className={adminInputClass}
                  {...systemForm.register('minimumOrderValue', { valueAsNumber: true })}
                />
              </Field>
              <button className={`${adminPrimaryButtonClass} w-full`} type="submit">
                <span className="material-symbols-outlined text-[20px]">save</span>
                Bayrakları kaydet
              </button>
            </form>

            <form
              className="space-y-4 rounded-card border border-outline-variant/35 bg-surface-container-lowest p-6 shadow-bakery"
              onSubmit={keyForm.handleSubmit(saveKey)}
            >
              <div className="flex items-center gap-2 border-b border-outline-variant/35 pb-3">
                <span className="material-symbols-outlined text-[22px] text-chocolate">
                  data_object
                </span>
                <h2 className="font-display text-xl font-semibold text-on-surface">
                  Tekil anahtar
                </h2>
              </div>
              <Field label="Anahtar" error={keyForm.formState.errors.key?.message}>
                <input
                  className={`${adminInputClass} font-mono text-sm`}
                  {...keyForm.register('key')}
                />
              </Field>
              <Field label="Değer (JSON)" error={keyForm.formState.errors.valueJson?.message}>
                <textarea
                  className={`${adminTextareaClass} font-mono text-sm`}
                  rows={4}
                  {...keyForm.register('valueJson')}
                />
              </Field>
              <button className={`${adminPrimaryButtonClass} w-full`} type="submit">
                <span className="material-symbols-outlined text-[20px]">save</span>
                Anahtarı güncelle
              </button>
            </form>
          </div>
        ) : null}
      </div>
    </PageSection>
  );
}

function activeFlagCount(values: SystemForm): number {
  return [
    values.otpActive,
    values.deliveryActive,
    values.pickupActive,
    values.loyaltyActive,
    values.paymentActive,
  ].filter(Boolean).length;
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

function ToggleField({
  label,
  register,
}: Readonly<{ label: string; register: UseFormRegisterReturn }>): React.JSX.Element {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-3 text-sm font-semibold text-on-surface transition hover:bg-surface-container-low">
      <span>{label}</span>
      <input
        type="checkbox"
        className="h-5 w-5 rounded border-outline-variant/60 text-chocolate focus:ring-secondary/50"
        {...register}
      />
    </label>
  );
}
