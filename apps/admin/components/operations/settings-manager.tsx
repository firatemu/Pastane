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
  adminSecondaryButtonClass,
  adminTextareaClass,
} from '../shared/admin-form-controls';

type SystemForm = z.infer<typeof systemSettingsSchema>;
type KeyForm = z.infer<typeof settingKeyPatchSchema>;
type SystemToggleKey = Exclude<keyof SystemForm, 'minimumOrderValue'>;

const currencyFormatter = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  minimumFractionDigits: 2,
});

const toggleGroups: Array<{
  title: string;
  description: string;
  items: Array<{ key: SystemToggleKey; label: string; description: string }>;
}> = [
  {
    title: 'Sipariş akışı',
    description: 'Müşterinin sipariş sırasında göreceği temel satış ve ödeme seçeneklerini yönetin.',
    items: [
      {
        key: 'deliveryActive',
        label: 'Kurye teslimatı',
        description: 'Adresli teslimat seçeneğini müşteri tarafında açık tutar.',
      },
      {
        key: 'pickupActive',
        label: 'Gel-al',
        description: 'Müşterinin siparişini mağazadan teslim almasına izin verir.',
      },
      {
        key: 'paymentActive',
        label: 'Online ödeme',
        description: 'Ödeme adımını ve tahsilat akışını aktif tutar.',
      },
    ],
  },
  {
    title: 'Doğrulama ve bağlılık',
    description: 'Güvenlik doğrulamasını ve müşteri bağlılığı ile ilgili modülleri kontrol edin.',
    items: [
      {
        key: 'otpActive',
        label: 'OTP doğrulaması',
        description: 'Tek kullanımlık doğrulama kodu gerektiren akışları aktif eder.',
      },
      {
        key: 'loyaltyActive',
        label: 'Sadakat programı',
        description: 'Puan kazanımı ve puan kullanımı süreçlerini devreye alır.',
      },
    ],
  },
];

const systemRowKeys = new Set<string>([
  'otpActive',
  'deliveryActive',
  'pickupActive',
  'loyaltyActive',
  'paymentActive',
  'minimumOrderValue',
]);

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
      setInfo('Temel operasyon ayarları güncellendi.');
      await load();
    } catch (e) {
      setError(adminMessageFromUnknownError(e, 'Temel ayarlar kaydedilemedi.'));
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
      setInfo(`"${v.key}" ayarı kaydedildi.`);
      keyForm.reset({ key: '', valueJson: '{}' });
      await load();
    } catch (e) {
      setError(adminMessageFromUnknownError(e, 'JSON değeri okunamadı veya kayıt yapılamadı.'));
    }
  }

  if (loading) return <LoadingState label="Ayarlar yükleniyor…" />;

  const canUpdate = can(permissions, ['settings.update']);
  const customRows = rows.filter((row) => !systemRowKeys.has(row.key));
  const minimumOrderValue = systemForm.watch('minimumOrderValue') ?? 0;

  return (
    <PageSection
      title="Ayarlar"
      description="Mağaza operasyonunu etkileyen temel ayarları tek ekranda yönetin. Standart alanlar sade tutulur, özel anahtarlar ise ayrı bir bölümde düzenlenir."
    >
      {error ? <ErrorState message={error} /> : null}
      {info ? (
        <div className="rounded-xl border border-tertiary/25 bg-tertiary-container px-4 py-3 text-sm font-medium text-tertiary">
          {info}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_360px]">
        <form
          className="space-y-6 rounded-card border border-outline-variant/35 bg-surface-container-lowest p-6 shadow-bakery"
          onSubmit={systemForm.handleSubmit(saveSystem)}
        >
          <div className="flex flex-col gap-3 border-b border-outline-variant/35 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[22px] text-chocolate">tune</span>
                <h2 className="font-display text-xl font-semibold text-on-surface">
                  Temel operasyon ayarları
                </h2>
              </div>
              <p className="text-sm leading-6 text-on-surface-variant">
                Günlük operasyonu etkileyen ana seçenekleri burada yönetin. Sistemde ayrıca
                saklanan özel anahtarlar ayrı bölümde gösterilir.
              </p>
            </div>
            <span className="w-fit rounded-full border border-outline-variant/50 bg-surface-container-low px-3 py-1 text-xs font-semibold text-on-surface-variant">
              {canUpdate ? 'Düzenlenebilir' : 'Salt okunur'}
            </span>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {toggleGroups.map((group) => (
              <section
                key={group.title}
                className="space-y-3 rounded-xl border border-outline-variant/35 bg-surface-container-low p-4"
              >
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-on-surface">{group.title}</h3>
                  <p className="text-sm leading-6 text-on-surface-variant">{group.description}</p>
                </div>
                <div className="space-y-3">
                  {group.items.map((item) => (
                    <ToggleField
                      key={item.key}
                      label={item.label}
                      description={item.description}
                      disabled={!canUpdate}
                      register={systemForm.register(item.key)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
            <Field
              label="Minimum sipariş tutarı"
              error={systemForm.formState.errors.minimumOrderValue?.message}
            >
              <input
                type="number"
                step="0.01"
                disabled={!canUpdate}
                className={`${adminInputClass} disabled:cursor-not-allowed disabled:opacity-60`}
                {...systemForm.register('minimumOrderValue', { valueAsNumber: true })}
              />
            </Field>

            <div className="rounded-xl border border-outline-variant/35 bg-surface-container-low p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
                Geçerli eşik
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-on-surface">
                {currencyFormatter.format(Number(minimumOrderValue))}
              </p>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                Bu tutarın altındaki siparişler müşteri tarafında tamamlanamaz.
              </p>
            </div>
          </div>

          {canUpdate ? (
            <div className="flex justify-end border-t border-outline-variant/35 pt-4">
              <button
                className={`${adminPrimaryButtonClass} w-full sm:w-auto`}
                type="submit"
                disabled={systemForm.formState.isSubmitting}
              >
                <span className="material-symbols-outlined text-[20px]">save</span>
                Temel ayarları kaydet
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-outline-variant/35 bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
              Bu ekranda mevcut ayarları görüntüleyebilirsiniz. Değişiklik yapmak için
              settings.update yetkisi gerekir.
            </div>
          )}
        </form>

        <aside className="space-y-5">
          {canUpdate ? (
            <form
              className="space-y-4 rounded-card border border-outline-variant/35 bg-surface-container-lowest p-6 shadow-bakery"
              onSubmit={keyForm.handleSubmit(saveKey)}
            >
              <div className="space-y-2 border-b border-outline-variant/35 pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[22px] text-chocolate">
                    data_object
                  </span>
                  <h2 className="font-display text-xl font-semibold text-on-surface">
                    Gelişmiş anahtar düzenleme
                  </h2>
                </div>
                <p className="text-sm leading-6 text-on-surface-variant">
                  Standart formun kapsamadığı JSON tabanlı ayarları eklemek veya güncellemek
                  için kullanın. Soldaki alanlar için bu form yerine temel ayarlar bölümünü
                  tercih edin.
                </p>
              </div>
              <Field label="Ayar anahtarı" error={keyForm.formState.errors.key?.message}>
                <input
                  className={`${adminInputClass} font-mono text-sm`}
                  placeholder="ornek.ayar.anahtari"
                  {...keyForm.register('key')}
                />
              </Field>
              <Field label="JSON değeri" error={keyForm.formState.errors.valueJson?.message}>
                <textarea
                  className={`${adminTextareaClass} font-mono text-sm`}
                  rows={8}
                  {...keyForm.register('valueJson')}
                />
              </Field>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  className={`${adminSecondaryButtonClass} flex-1`}
                  onClick={() => keyForm.reset({ key: '', valueJson: '{}' })}
                >
                  Formu temizle
                </button>
                <button
                  className={`${adminPrimaryButtonClass} flex-1`}
                  type="submit"
                  disabled={keyForm.formState.isSubmitting}
                >
                  <span className="material-symbols-outlined text-[20px]">save</span>
                  Anahtarı kaydet
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3 rounded-card border border-outline-variant/35 bg-surface-container-lowest p-6 shadow-bakery">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[22px] text-chocolate">lock</span>
                <h2 className="font-display text-xl font-semibold text-on-surface">
                  Gelişmiş düzenleme kapalı
                </h2>
              </div>
              <p className="text-sm leading-6 text-on-surface-variant">
                Bu bölüm yalnızca ayar güncelleme yetkisi olan yöneticiler için açıktır.
                İhtiyaç halinde mevcut özel anahtarları aşağıdaki listeden inceleyebilirsiniz.
              </p>
            </div>
          )}
        </aside>
      </div>

      <section className="rounded-card border border-outline-variant/35 bg-surface-container-lowest p-6 shadow-bakery">
        <div className="flex flex-col gap-3 border-b border-outline-variant/35 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[22px] text-chocolate">database</span>
              <h2 className="font-display text-xl font-semibold text-on-surface">
                Özel ayar anahtarları
              </h2>
            </div>
            <p className="text-sm leading-6 text-on-surface-variant">
              Temel operasyon ayarları dışındaki ek kayıtlar burada listelenir. Böylece aynı
              bilgi birden fazla blokta tekrar edilmez.
            </p>
          </div>
          <span className="w-fit rounded-full border border-outline-variant/50 bg-surface-container-low px-3 py-1 text-xs font-semibold text-on-surface-variant">
            {customRows.length} kayıt
          </span>
        </div>

        {customRows.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-outline-variant/50 bg-surface-container-low px-4 py-5 text-sm text-on-surface-variant">
            Standart alanların dışında kayıtlı özel ayar bulunmuyor.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {customRows.map((row) => (
              <div
                key={row.id}
                className="rounded-xl border border-outline-variant/35 bg-surface-container-low px-4 py-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-on-surface">
                        {row.key}
                      </span>
                      <span className="rounded-full bg-surface-container-lowest px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
                        Son güncelleme {new Date(row.updatedAt).toLocaleString('tr-TR')}
                      </span>
                    </div>
                    <pre className="overflow-x-auto rounded-xl bg-surface-container-lowest px-3 py-3 text-xs text-on-surface-variant">
                      {formatSettingValue(row.value)}
                    </pre>
                  </div>

                  {canUpdate ? (
                    <button
                      type="button"
                      className={`${adminSecondaryButtonClass} shrink-0`}
                      onClick={() =>
                        keyForm.reset({
                          key: row.key,
                          valueJson: formatSettingValue(row.value),
                        })
                      }
                    >
                      Düzenlemek için forma taşı
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </PageSection>
  );
}

function formatSettingValue(value: unknown): string {
  return JSON.stringify(value, null, 2) ?? 'null';
}

function ToggleField({
  label,
  description,
  disabled,
  register,
}: Readonly<{
  label: string;
  description: string;
  disabled: boolean;
  register: UseFormRegisterReturn;
}>): React.JSX.Element {
  return (
    <label className="flex items-start justify-between gap-3 rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-3 text-sm text-on-surface transition hover:bg-surface-container-low">
      <span className="space-y-1">
        <span className="block font-semibold text-on-surface">{label}</span>
        <span className="block text-xs leading-5 text-on-surface-variant">{description}</span>
      </span>
      <input
        type="checkbox"
        disabled={disabled}
        className="mt-0.5 h-5 w-5 shrink-0 rounded border-outline-variant/60 text-chocolate focus:ring-secondary/50 disabled:cursor-not-allowed disabled:opacity-60"
        {...register}
      />
    </label>
  );
}
