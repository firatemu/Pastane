'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { courierLoginFormSchema } from '../../lib/auth/courier-login-schema';
import { courierMessageFromPayload, type ParsedCourierApiPayload } from '../../lib/deliveries/courier-api-error';

export function CourierLoginForm(): React.JSX.Element {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);

    const parsed = courierLoginFormSchema.safeParse({ phone: phone.trim(), password });
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors;
      setError(fe.phone?.[0] ?? fe.password?.[0] ?? 'Bilgileri kontrol edin.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      const payload = (await response.json()) as ParsedCourierApiPayload;
      if (response.status === 403) {
        router.replace('/access-denied');
        return;
      }
      if (!response.ok) {
        setError(courierMessageFromPayload(response.status, payload, 'Giriş başarısız.'));
        return;
      }
      router.replace('/home');
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={submit} noValidate>
      <label className="block space-y-2 text-sm font-medium">
        <span>Telefon</span>
        <input
          className="min-h-12 w-full rounded-2xl border bg-white px-4 py-3 outline-none transition focus:border-amber-500"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="905550000004"
          autoComplete="username"
          inputMode="numeric"
        />
      </label>
      <label className="block space-y-2 text-sm font-medium">
        <span>Şifre</span>
        <input
          className="min-h-12 w-full rounded-2xl border bg-white px-4 py-3 outline-none transition focus:border-amber-500"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          autoComplete="current-password"
        />
      </label>
      {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      <button
        className="min-h-14 w-full rounded-2xl bg-stone-900 px-4 py-3 font-medium text-white transition disabled:cursor-not-allowed disabled:bg-stone-400"
        disabled={submitting}
        type="submit"
      >
        {submitting ? 'Giriş yapılıyor…' : 'Giriş yap'}
      </button>
    </form>
  );
}
