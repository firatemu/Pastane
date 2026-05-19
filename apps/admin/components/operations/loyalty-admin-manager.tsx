'use client';

import { useEffect, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { adminFetch } from '../../lib/api/catalog';
import { adminMessageFromUnknownError } from '../../lib/messages/admin-facing-errors';
import { can } from '../../lib/permissions/can';
import { loyaltyAdjustSchema, loyaltySettingsFormSchema } from '../../lib/operations/schemas';
import type { LoyaltySettingRow } from '../../lib/operations/types';
import { PageSection } from '../shared/page-section';
import { Field } from '../shared/form-field';
import { ErrorState, LoadingState } from '../shared/async-state';

type SettingsForm = z.infer<typeof loyaltySettingsFormSchema>;
type AdjustForm = z.infer<typeof loyaltyAdjustSchema>;

export function LoyaltyAdminManager({ permissions }: { permissions: string[] }): React.JSX.Element {
  const [rows, setRows] = useState<LoyaltySettingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const settingsForm = useForm<SettingsForm>({
    resolver: zodResolver(loyaltySettingsFormSchema) as Resolver<SettingsForm>,
    defaultValues: {
      earnRate: 0.01,
      pointValue: 1,
      minimumRedeem: 0,
      isActive: true,
    },
  });

  const adjustForm = useForm<AdjustForm>({
    resolver: zodResolver(loyaltyAdjustSchema) as Resolver<AdjustForm>,
    defaultValues: { points: 1, userId: '', qrCode: '', note: '' },
  });

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        setError(null);
        const list = await adminFetch<LoyaltySettingRow[]>('/loyalty/settings');
        if (cancelled) return;
        setRows(list);
        const latest = list.find((r) => r.isActive) ?? list[0];
        if (latest) {
          settingsForm.reset({
            earnRate: Number(latest.earnRate),
            pointValue: Number(latest.pointValue),
            minimumRedeem: latest.minimumRedeem,
            isActive: latest.isActive,
          });
        }
      } catch (e) {
        if (!cancelled) setError(adminMessageFromUnknownError(e, 'Sadakat ayarları yüklenemedi.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  async function saveSettings(v: SettingsForm): Promise<void> {
    setInfo(null);
    try {
      setError(null);
      await adminFetch('/loyalty/settings', {
        method: 'PATCH',
        body: JSON.stringify(v),
      });
      setInfo('Yeni sadakat ayarı kaydı oluşturuldu.');
      await adminFetch<LoyaltySettingRow[]>('/loyalty/settings').then((list) => {
        setRows(list);
        const latest = list.find((r) => r.isActive) ?? list[0];
        if (latest) {
          settingsForm.reset({
            earnRate: Number(latest.earnRate),
            pointValue: Number(latest.pointValue),
            minimumRedeem: latest.minimumRedeem,
            isActive: latest.isActive,
          });
        }
      });
    } catch (e) {
      setError(adminMessageFromUnknownError(e, 'Kaydetme işlemi başarısız oldu.'));
    }
  }

  async function adjust(v: AdjustForm): Promise<void> {
    setInfo(null);
    try {
      setError(null);
      await adminFetch('/loyalty/adjust', {
        method: 'POST',
        body: JSON.stringify({
          points: v.points,
          userId: v.userId || undefined,
          qrCode: v.qrCode || undefined,
          note: v.note || undefined,
        }),
      });
      setInfo('Puan düzeltmesi uygulandı.');
      adjustForm.reset({ points: 1, userId: '', qrCode: '', note: '' });
    } catch (e) {
      setError(adminMessageFromUnknownError(e, 'Puan düzeltmesi uygulanamadı.'));
    }
  }

  if (loading) return <LoadingState label="Sadakat yükleniyor…" />;

  return (
    <PageSection title="Sadakat programı" description="Yeni ayar kaydı oluşturma ve manuel puan düzeltmesi.">
      {error ? <ErrorState message={error} /> : null}
      {info ? <p className="mb-4 text-sm text-green-800">{info}</p> : null}

      <div className="mb-6 rounded-3xl border bg-white p-5">
        <h2 className="font-semibold">Mevcut ayar geçmişi</h2>
        <ul className="mt-3 space-y-2 text-sm text-stone-700">
          {rows.map((r) => (
            <li key={r.id}>
              {new Date(r.createdAt).toLocaleString('tr-TR')} — kazanç: {r.earnRate}, değer: {r.pointValue}, min. kullanım: {r.minimumRedeem},{' '}
              {r.isActive ? 'aktif' : 'pasif'}
            </li>
          ))}
        </ul>
      </div>

      {can(permissions, ['loyalty.manageSettings']) ? (
        <form className="mb-8 space-y-4 rounded-3xl border bg-white p-5" onSubmit={settingsForm.handleSubmit(saveSettings)}>
          <h2 className="font-semibold">Yeni ayar kaydı</h2>
          <Field label="Kazanç oranı (sipariş tutarı × oran)" error={settingsForm.formState.errors.earnRate?.message}>
            <input type="number" step="0.0001" className="w-full rounded-2xl border px-3 py-2" {...settingsForm.register('earnRate', { valueAsNumber: true })} />
          </Field>
          <Field label="Puan birim değeri" error={settingsForm.formState.errors.pointValue?.message}>
            <input type="number" step="0.01" className="w-full rounded-2xl border px-3 py-2" {...settingsForm.register('pointValue', { valueAsNumber: true })} />
          </Field>
          <Field label="Minimum kullanım puanı" error={settingsForm.formState.errors.minimumRedeem?.message}>
            <input type="number" className="w-full rounded-2xl border px-3 py-2" {...settingsForm.register('minimumRedeem', { valueAsNumber: true })} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...settingsForm.register('isActive')} />
            Aktif olarak kaydet
          </label>
          <button className="rounded-2xl bg-stone-900 px-4 py-2 text-white" type="submit">
            Ayarı kaydet
          </button>
        </form>
      ) : null}

      {can(permissions, ['loyalty.manageSettings']) ? (
        <form className="space-y-4 rounded-3xl border bg-white p-5" onSubmit={adjustForm.handleSubmit(adjust)}>
          <h2 className="font-semibold">Manuel puan ekleme</h2>
          <Field label="Puan (+)" error={adjustForm.formState.errors.points?.message}>
            <input type="number" className="w-full rounded-2xl border px-3 py-2" {...adjustForm.register('points', { valueAsNumber: true })} />
          </Field>
          <Field label="Kullanıcı UUID" error={adjustForm.formState.errors.userId?.message}>
            <input className="w-full rounded-2xl border px-3 py-2" {...adjustForm.register('userId')} />
          </Field>
          <Field label="QR kod (alternatif)" error={adjustForm.formState.errors.qrCode?.message}>
            <input className="w-full rounded-2xl border px-3 py-2 font-mono text-sm" {...adjustForm.register('qrCode')} />
          </Field>
          <Field label="Not" error={adjustForm.formState.errors.note?.message}>
            <input className="w-full rounded-2xl border px-3 py-2" {...adjustForm.register('note')} />
          </Field>
          <button className="rounded-2xl bg-stone-900 px-4 py-2 text-white" type="submit">
            Düzeltmeyi uygula
          </button>
        </form>
      ) : null}
    </PageSection>
  );
}
