'use client';

import { useEffect, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
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

  return (
    <PageSection title="Sistem ayarları" description="Bayraklar ve ham ayar kayıtları backend ile aynıdır.">
      {error ? <ErrorState message={error} /> : null}
      {info ? <p className="mb-4 text-sm text-green-800">{info}</p> : null}

      {can(permissions, ['settings.update']) ? (
        <form className="mb-8 space-y-4 rounded-3xl border bg-white p-5" onSubmit={systemForm.handleSubmit(saveSystem)}>
          <h2 className="font-semibold">Sistem bayrakları</h2>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...systemForm.register('otpActive')} />
            OTP aktif
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...systemForm.register('deliveryActive')} />
            Teslimat aktif
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...systemForm.register('pickupActive')} />
            Gel-al aktif
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...systemForm.register('loyaltyActive')} />
            Sadakat aktif
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...systemForm.register('paymentActive')} />
            Ödeme aktif
          </label>
          <Field label="Minimum sipariş tutarı" error={systemForm.formState.errors.minimumOrderValue?.message}>
            <input type="number" step="0.01" className="w-full max-w-xs rounded-2xl border px-3 py-2" {...systemForm.register('minimumOrderValue', { valueAsNumber: true })} />
          </Field>
          <button className="rounded-2xl bg-stone-900 px-4 py-2 text-white" type="submit">
            Bayrakları kaydet
          </button>
        </form>
      ) : (
        <p className="mb-6 text-sm text-stone-600">Bayrakları değiştirmek için `settings.update` gerekir.</p>
      )}

      {can(permissions, ['settings.update']) ? (
        <form className="mb-8 space-y-4 rounded-3xl border bg-white p-5" onSubmit={keyForm.handleSubmit(saveKey)}>
          <h2 className="font-semibold">Tekil anahtar (JSON değer)</h2>
          <Field label="Anahtar" error={keyForm.formState.errors.key?.message}>
            <input className="w-full rounded-2xl border px-3 py-2 font-mono text-sm" {...keyForm.register('key')} />
          </Field>
          <Field label="Değer (JSON)" error={keyForm.formState.errors.valueJson?.message}>
            <textarea className="w-full rounded-2xl border px-3 py-2 font-mono text-sm" rows={4} {...keyForm.register('valueJson')} />
          </Field>
          <button className="rounded-2xl bg-stone-900 px-4 py-2 text-white" type="submit">
            Anahtarı güncelle
          </button>
        </form>
      ) : null}

      <div className="rounded-3xl border bg-white p-5">
        <h2 className="font-semibold">Tüm ayar kayıtları</h2>
        <ul className="mt-4 space-y-2 text-sm">
          {rows.map((r) => (
            <li key={r.id} className="rounded-2xl bg-stone-50 p-3">
              <span className="font-mono font-medium">{r.key}</span>
              <pre className="mt-1 overflow-x-auto text-xs text-stone-700">{JSON.stringify(r.value, null, 0)}</pre>
            </li>
          ))}
        </ul>
      </div>
    </PageSection>
  );
}
