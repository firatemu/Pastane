'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { adminFetch } from '../../lib/api/catalog';
import { adminMessageFromUnknownError } from '../../lib/messages/admin-facing-errors';
import { sendNotificationSchema } from '../../lib/operations/schemas';
import type { AdminUserRow } from '../../lib/operations/types';
import { ErrorState } from '../shared/async-state';
import { Field } from '../shared/form-field';
import {
  adminInputClass,
  adminPrimaryButtonClass,
  adminSelectClass,
  adminTextareaClass,
} from '../shared/admin-form-controls';

type Form = z.infer<typeof sendNotificationSchema>;

const CHANNELS: Array<{
  value: Form['type'];
  label: string;
  icon: string;
  description: string;
}> = [
  {
    value: 'IN_APP',
    label: 'Uygulama içi',
    icon: 'notifications',
    description: 'Panel ve müşteri uygulaması içi bildirim.',
  },
  {
    value: 'PUSH',
    label: 'Anlık bildirim',
    icon: 'tap_and_play',
    description: 'Cihaz bildirimi olarak iletilir.',
  },
  {
    value: 'SMS',
    label: 'SMS',
    icon: 'sms',
    description: 'Telefon numarasına kısa mesaj.',
  },
  {
    value: 'EMAIL',
    label: 'E-posta',
    icon: 'mail',
    description: 'Kullanıcının e-posta adresine gönderim.',
  },
];

export function NotificationsSendManager(): React.JSX.Element {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [userLoadError, setUserLoadError] = useState<string | null>(null);
  const [recipientSearch, setRecipientSearch] = useState('');

  const form = useForm<Form>({
    resolver: zodResolver(sendNotificationSchema),
    defaultValues: {
      userId: '',
      type: 'IN_APP',
      title: '',
      body: '',
      metadataJson: '',
    },
  });

  const selectedType = form.watch('type');
  const title = form.watch('title');
  const body = form.watch('body');
  const metadataJson = form.watch('metadataJson');
  const userId = form.watch('userId');

  useEffect(() => {
    async function loadUsers(): Promise<void> {
      try {
        setUserLoadError(null);
        setUsers(await adminFetch<AdminUserRow[]>('/users?scope=all'));
      } catch (caught) {
        setUserLoadError(adminMessageFromUnknownError(caught, 'Kullanıcı listesi alınamadı.'));
      }
    }
    void loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const q = recipientSearch.trim().toLowerCase();
    if (!q) return users.slice(0, 8);
    return users
      .filter((user) =>
        [user.firstName, user.lastName, user.phone, user.email ?? '', user.role.name]
          .join(' ')
          .toLowerCase()
          .includes(q),
      )
      .slice(0, 8);
  }, [recipientSearch, users]);

  const selectedUser = useMemo(
    () => users.find((user) => user.id === userId) ?? null,
    [userId, users],
  );

  const metadataState = useMemo(() => {
    const raw = metadataJson?.trim();
    if (!raw) return { valid: true, label: 'Boş', preview: '{}' };
    try {
      const parsed = JSON.parse(raw) as unknown;
      return {
        valid: true,
        label: 'Geçerli JSON',
        preview: JSON.stringify(parsed, null, 2),
      };
    } catch {
      return { valid: false, label: 'Geçersiz JSON', preview: raw };
    }
  }, [metadataJson]);

  async function onSubmit(values: Form): Promise<void> {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      let metadata: Record<string, unknown> | undefined;
      if (values.metadataJson?.trim()) {
        metadata = JSON.parse(values.metadataJson) as Record<string, unknown>;
      }
      await adminFetch('/notifications/send', {
        method: 'POST',
        body: JSON.stringify({
          userId: values.userId,
          type: values.type,
          title: values.title,
          body: values.body,
          metadata,
        }),
      });
      setMessage('Bildirim kuyruğa alındı.');
      setRecipientSearch('');
      form.reset({ userId: '', type: 'IN_APP', title: '', body: '', metadataJson: '' });
    } catch (caught) {
      setError(adminMessageFromUnknownError(caught, 'Bildirim gönderilemedi.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-[1.75rem] border border-outline-variant/40 bg-chocolate text-surface-container-lowest shadow-bakery">
        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_360px] lg:p-8">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
              <span className="material-symbols-outlined text-[16px]">campaign</span>
              Operasyon bildirimi
            </div>
            <h1 className="font-display text-4xl font-semibold tracking-tight">Bildirim Merkezi</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-surface-container-low/85">
              Tek alıcıya hedefli bildirim gönderin, kanal seçin ve mesajı göndermeden önce cihazda
              nasıl görüneceğini kontrol edin.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 rounded-2xl bg-white/10 p-3">
            <HeroMetric label="Kanal" value="4" icon="hub" />
            <HeroMetric label="Alıcı" value={users.length || '-'} icon="group" />
            <HeroMetric label="Durum" value={busy ? 'Aktif' : 'Hazır'} icon="bolt" />
          </div>
        </div>
      </div>

      {error ? <ErrorState message={error} /> : null}
      {message ? (
        <div className="rounded-2xl border border-tertiary/25 bg-tertiary-container px-4 py-3 text-sm font-semibold text-tertiary">
          {message}
        </div>
      ) : null}
      {userLoadError ? (
        <div className="rounded-2xl border border-outline-variant/35 bg-surface-container-lowest px-4 py-3 text-sm text-on-surface-variant">
          {userLoadError} Kullanıcı ID alanına UUID elle girerek devam edebilirsiniz.
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[320px_1fr_360px]">
        <aside className="space-y-4 rounded-card border border-outline-variant/35 bg-surface-container-lowest p-4 shadow-bakery">
          <div>
            <h2 className="font-display text-xl font-semibold text-on-surface">Alıcı</h2>
            <p className="mt-1 text-sm text-on-surface-variant">Kullanıcı seçin veya UUID girin.</p>
          </div>
          <div className="relative">
            <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-outline">
              search
            </span>
            <input
              className={`${adminInputClass} pl-10`}
              placeholder="Ad, telefon, rol…"
              value={recipientSearch}
              onChange={(event) => setRecipientSearch(event.target.value)}
            />
          </div>
          <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
            {filteredUsers.map((user) => {
              const active = user.id === userId;
              return (
                <button
                  key={user.id}
                  type="button"
                  className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                    active
                      ? 'border-secondary bg-secondary-container text-secondary'
                      : 'border-outline-variant/35 bg-surface-container-low hover:bg-surface-container'
                  }`}
                  onClick={() => form.setValue('userId', user.id, { shouldValidate: true })}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-container-lowest text-sm font-bold text-chocolate">
                      {initials(user)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">
                        {user.firstName} {user.lastName}
                      </span>
                      <span className="block truncate text-xs text-on-surface-variant">
                        {user.phone} · {user.role.name}
                      </span>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <form
          className="space-y-5 rounded-card border border-outline-variant/35 bg-surface-container-lowest p-5 shadow-bakery"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Kullanıcı ID" error={form.formState.errors.userId?.message}>
              <input
                className={`${adminInputClass} font-mono text-sm`}
                {...form.register('userId')}
              />
            </Field>
            <Field label="Kanal" error={form.formState.errors.type?.message}>
              <select className={adminSelectClass} {...form.register('type')}>
                {CHANNELS.map((channel) => (
                  <option key={channel.value} value={channel.value}>
                    {channel.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            {CHANNELS.map((channel) => {
              const active = selectedType === channel.value;
              return (
                <button
                  key={channel.value}
                  type="button"
                  className={`rounded-2xl border p-4 text-left transition ${
                    active
                      ? 'border-secondary bg-secondary-container text-secondary shadow-bakery'
                      : 'border-outline-variant/35 bg-surface-container-low hover:bg-surface-container'
                  }`}
                  onClick={() => form.setValue('type', channel.value, { shouldValidate: true })}
                >
                  <span className="material-symbols-outlined text-[24px]">{channel.icon}</span>
                  <span className="mt-2 block text-sm font-semibold">{channel.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-on-surface-variant">
                    {channel.description}
                  </span>
                </button>
              );
            })}
          </div>

          <Field label="Başlık" error={form.formState.errors.title?.message}>
            <input
              className={adminInputClass}
              placeholder="Örn: Siparişiniz hazırlanıyor"
              {...form.register('title')}
            />
          </Field>
          <Field label="Mesaj" error={form.formState.errors.body?.message}>
            <textarea
              className={`${adminTextareaClass} min-h-[150px]`}
              placeholder="Kısa, net ve aksiyon odaklı bir mesaj yazın."
              {...form.register('body')}
            />
          </Field>
          <Field
            label={`Metadata (${metadataState.label})`}
            error={form.formState.errors.metadataJson?.message}
          >
            <textarea
              className={`${adminTextareaClass} min-h-[120px] font-mono text-sm ${
                metadataState.valid ? '' : 'border-error focus:border-error'
              }`}
              placeholder='{"orderId":"...","screen":"orders"}'
              {...form.register('metadataJson')}
            />
          </Field>
          <button
            disabled={busy || !metadataState.valid}
            className={`${adminPrimaryButtonClass} w-full py-3 disabled:opacity-60`}
            type="submit"
          >
            <span className={`material-symbols-outlined text-[20px] ${busy ? 'animate-spin' : ''}`}>
              {busy ? 'progress_activity' : 'send'}
            </span>
            {busy ? 'Kuyruğa alınıyor…' : 'Bildirimi gönder'}
          </button>
        </form>

        <aside className="space-y-4">
          <div className="rounded-[1.75rem] border border-outline-variant/35 bg-surface-container-lowest p-5 shadow-bakery">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold text-on-surface">Önizleme</h2>
              <span className="rounded-full bg-surface-container px-3 py-1 text-xs font-semibold text-secondary">
                {CHANNELS.find((channel) => channel.value === selectedType)?.label}
              </span>
            </div>
            <div className="rounded-[1.5rem] border border-outline-variant/35 bg-surface-container-low p-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-on-surface-variant">
                <span className="material-symbols-outlined text-[16px]">bakery_dining</span>
                Pastane
              </div>
              <p className="text-base font-semibold text-on-surface">
                {title || 'Bildirim başlığı'}
              </p>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                {body || 'Mesaj içeriği burada canlı olarak görüntülenir.'}
              </p>
              {selectedUser ? (
                <div className="mt-4 rounded-xl bg-surface-container-lowest px-3 py-2 text-xs text-on-surface-variant">
                  {selectedUser.firstName} {selectedUser.lastName} · {selectedUser.phone}
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-card border border-outline-variant/35 bg-surface-container-lowest p-5 shadow-bakery">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold text-on-surface">Metadata</h2>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  metadataState.valid
                    ? 'bg-tertiary-container text-tertiary'
                    : 'bg-error-container text-error'
                }`}
              >
                {metadataState.label}
              </span>
            </div>
            <pre className="max-h-72 overflow-auto rounded-xl bg-chocolate p-4 text-xs leading-5 text-surface-container-lowest">
              {metadataState.preview}
            </pre>
          </div>
        </aside>
      </div>
    </section>
  );
}

function initials(user: AdminUserRow): string {
  return `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase();
}

function HeroMetric({
  icon,
  label,
  value,
}: Readonly<{ icon: string; label: string; value: string | number }>): React.JSX.Element {
  return (
    <div className="rounded-xl bg-white/10 p-3">
      <span className="material-symbols-outlined text-[20px]">{icon}</span>
      <p className="mt-2 text-lg font-semibold">{value}</p>
      <p className="text-[11px] font-medium text-surface-container-low/75">{label}</p>
    </div>
  );
}
