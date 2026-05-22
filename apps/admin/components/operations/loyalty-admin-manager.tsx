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
import {
  adminInputClass,
  adminPrimaryButtonClass,
  adminTextareaClass,
} from '../shared/admin-form-controls';

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

  const latest = rows.find((r) => r.isActive) ?? rows[0];
  const canManage = can(permissions, ['loyalty.manageSettings']);

  return (
    <PageSection
      title="Sadakat programı"
      description="Puan kazanım oranını, puan değerini ve manuel düzeltme işlemlerini yönetin."
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
            <SummaryTile icon="card_membership" label="Ayar kaydı" value={rows.length} />
            <SummaryTile icon="percent" label="Kazanç oranı" value={latest?.earnRate ?? '0'} />
            <SummaryTile icon="payments" label="Puan değeri" value={latest?.pointValue ?? '0'} />
            <SummaryTile
              icon="verified"
              label="Durum"
              value={latest?.isActive ? 'Aktif' : 'Pasif'}
            />
          </div>

          <div className="rounded-card border border-outline-variant/35 bg-surface-container-lowest p-5 shadow-bakery">
            <div className="mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[22px] text-chocolate">history</span>
              <h2 className="font-display text-xl font-semibold text-on-surface">Ayar geçmişi</h2>
            </div>
            <div className="space-y-2">
              {rows.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-col gap-2 rounded-xl border border-outline-variant/35 bg-surface-container-low px-3 py-3 text-sm text-on-surface-variant sm:flex-row sm:items-center sm:justify-between"
                >
                  <span>{new Date(r.createdAt).toLocaleString('tr-TR')}</span>
                  <span>
                    Kazanç {r.earnRate} · Değer {r.pointValue} · Min. {r.minimumRedeem}
                  </span>
                  <span className="w-fit rounded-full bg-surface-container-lowest px-2.5 py-0.5 text-xs font-semibold text-secondary">
                    {r.isActive ? 'Aktif' : 'Pasif'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {canManage ? (
          <div className="space-y-5">
            <form
              className="space-y-4 rounded-card border border-outline-variant/35 bg-surface-container-lowest p-6 shadow-bakery"
              onSubmit={settingsForm.handleSubmit(saveSettings)}
            >
              <div className="flex items-center gap-2 border-b border-outline-variant/35 pb-3">
                <span className="material-symbols-outlined text-[22px] text-chocolate">
                  card_membership
                </span>
                <h2 className="font-display text-xl font-semibold text-on-surface">
                  Yeni ayar kaydı
                </h2>
              </div>
              <Field label="Kazanç oranı" error={settingsForm.formState.errors.earnRate?.message}>
                <input
                  type="number"
                  step="0.0001"
                  className={adminInputClass}
                  {...settingsForm.register('earnRate', { valueAsNumber: true })}
                />
              </Field>
              <Field
                label="Puan birim değeri"
                error={settingsForm.formState.errors.pointValue?.message}
              >
                <input
                  type="number"
                  step="0.01"
                  className={adminInputClass}
                  {...settingsForm.register('pointValue', { valueAsNumber: true })}
                />
              </Field>
              <Field
                label="Minimum kullanım puanı"
                error={settingsForm.formState.errors.minimumRedeem?.message}
              >
                <input
                  type="number"
                  className={adminInputClass}
                  {...settingsForm.register('minimumRedeem', { valueAsNumber: true })}
                />
              </Field>
              <label className="flex items-center justify-between gap-3 rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-3 text-sm font-semibold text-on-surface">
                Aktif olarak kaydet
                <input
                  type="checkbox"
                  className="h-5 w-5 rounded border-outline-variant/60 text-chocolate focus:ring-secondary/50"
                  {...settingsForm.register('isActive')}
                />
              </label>
              <button className={`${adminPrimaryButtonClass} w-full`} type="submit">
                <span className="material-symbols-outlined text-[20px]">save</span>
                Ayarı kaydet
              </button>
            </form>

            <form
              className="space-y-4 rounded-card border border-outline-variant/35 bg-surface-container-lowest p-6 shadow-bakery"
              onSubmit={adjustForm.handleSubmit(adjust)}
            >
              <div className="flex items-center gap-2 border-b border-outline-variant/35 pb-3">
                <span className="material-symbols-outlined text-[22px] text-chocolate">
                  add_card
                </span>
                <h2 className="font-display text-xl font-semibold text-on-surface">Manuel puan</h2>
              </div>
              <Field label="Puan (+)" error={adjustForm.formState.errors.points?.message}>
                <input
                  type="number"
                  className={adminInputClass}
                  {...adjustForm.register('points', { valueAsNumber: true })}
                />
              </Field>
              <Field label="Kullanıcı UUID" error={adjustForm.formState.errors.userId?.message}>
                <input
                  className={`${adminInputClass} font-mono text-sm`}
                  {...adjustForm.register('userId')}
                />
              </Field>
              <Field
                label="QR kod (alternatif)"
                error={adjustForm.formState.errors.qrCode?.message}
              >
                <input
                  className={`${adminInputClass} font-mono text-sm`}
                  {...adjustForm.register('qrCode')}
                />
              </Field>
              <Field label="Not" error={adjustForm.formState.errors.note?.message}>
                <textarea
                  className={adminTextareaClass}
                  rows={3}
                  {...adjustForm.register('note')}
                />
              </Field>
              <button className={`${adminPrimaryButtonClass} w-full`} type="submit">
                <span className="material-symbols-outlined text-[20px]">check_circle</span>
                Düzeltmeyi uygula
              </button>
            </form>
          </div>
        ) : null}
      </div>
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
