'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminLoginFormSchema } from '../../lib/auth/admin-login-schema';
import { messageFromAdminApiPayload, type ParsedAdminApiPayload } from '../../lib/messages/admin-facing-errors';

export function LoginForm(): React.JSX.Element {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);

    const parsed = adminLoginFormSchema.safeParse({ phone: phone.trim(), password });
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors;
      setError(fe.phone?.[0] ?? fe.password?.[0] ?? 'Girdiğiniz bilgileri kontrol edin.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      const payload = (await response.json()) as ParsedAdminApiPayload;
      if (!response.ok) {
        setError(messageFromAdminApiPayload(response.status, payload, 'Giriş başarısız.'));
        return;
      }
      router.replace('/dashboard');
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={onSubmit} noValidate>
      <label className="block space-y-2 text-sm font-medium">
        <span>Telefon</span>
        <input
          className="w-full rounded-2xl border bg-white px-4 py-3 outline-none transition focus:border-amber-500"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="905550000001"
          autoComplete="username"
          inputMode="numeric"
        />
      </label>
      <label className="block space-y-2 text-sm font-medium">
        <span>Şifre</span>
        <input
          className="w-full rounded-2xl border bg-white px-4 py-3 outline-none transition focus:border-amber-500"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          autoComplete="current-password"
        />
      </label>
      {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      <button
        className="w-full rounded-2xl bg-stone-900 px-4 py-3 font-medium text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? 'Giriş yapılıyor…' : 'Giriş yap'}
      </button>
    </form>
  );
}
