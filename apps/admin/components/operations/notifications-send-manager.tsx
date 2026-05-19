'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { adminFetch } from '../../lib/api/catalog';
import { adminMessageFromUnknownError } from '../../lib/messages/admin-facing-errors';
import { sendNotificationSchema } from '../../lib/operations/schemas';
import type { z } from 'zod';
import { PageSection } from '../shared/page-section';
import { Field } from '../shared/form-field';
import { ErrorState } from '../shared/async-state';

type Form = z.infer<typeof sendNotificationSchema>;

export function NotificationsSendManager(): React.JSX.Element {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      form.reset({ userId: '', type: 'IN_APP', title: '', body: '', metadataJson: '' });
    } catch (e) {
      setError(adminMessageFromUnknownError(e, 'Bildirim gönderilemedi.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageSection title="Bildirim gönder" description="Alıcı kullanıcı UUID ve kanal gereklidir.">
      {error ? <ErrorState message={error} /> : null}
      {message ? <p className="mb-4 text-sm text-green-800">{message}</p> : null}
      <form className="max-w-lg space-y-4 rounded-3xl border bg-white p-5" onSubmit={form.handleSubmit(onSubmit)}>
        <Field label="Kullanıcı ID" error={form.formState.errors.userId?.message}>
          <input className="w-full rounded-2xl border px-3 py-2" {...form.register('userId')} />
        </Field>
        <Field label="Kanal" error={form.formState.errors.type?.message}>
          <select className="w-full rounded-2xl border px-3 py-2" {...form.register('type')}>
            <option value="IN_APP">Uygulama içi</option>
            <option value="PUSH">Anlık bildirim</option>
            <option value="SMS">SMS</option>
            <option value="EMAIL">E-posta</option>
          </select>
        </Field>
        <Field label="Başlık" error={form.formState.errors.title?.message}>
          <input className="w-full rounded-2xl border px-3 py-2" {...form.register('title')} />
        </Field>
        <Field label="İçerik" error={form.formState.errors.body?.message}>
          <textarea className="w-full rounded-2xl border px-3 py-2" rows={4} {...form.register('body')} />
        </Field>
        <Field label="Metadata (JSON, isteğe bağlı)" error={form.formState.errors.metadataJson?.message}>
          <textarea className="w-full rounded-2xl border px-3 py-2 font-mono text-sm" rows={3} {...form.register('metadataJson')} />
        </Field>
        <button disabled={busy} className="rounded-2xl bg-stone-900 px-4 py-2 text-white disabled:opacity-60" type="submit">
          Gönder
        </button>
      </form>
    </PageSection>
  );
}
