'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { customerLoginFormSchema } from '../../lib/auth/customer-form-schemas';

export function CustomerLoginForm(): React.JSX.Element {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    const parsed = customerLoginFormSchema.safeParse({ phone, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Giriş başarısız.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: parsed.data.phone, password: parsed.data.password }),
      });
      const payload = (await response.json()) as { message?: string };
      if (response.status === 403) {
        router.replace('/access-denied');
        return;
      }
      if (!response.ok) {
        setError(payload.message ?? 'Giriş başarısız.');
        return;
      }
      router.replace('/hesabim');
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="mt-8 space-y-5" noValidate onSubmit={submit}>
      <label className="block space-y-2 text-sm font-medium">
        <span>Telefon</span>
        <input className="min-h-12 w-full rounded-2xl border bg-white px-4 py-3 outline-none transition focus:border-amber-500" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="905XXXXXXXXX" inputMode="numeric" autoComplete="tel" required />
      </label>
      <label className="block space-y-2 text-sm font-medium">
        <span>Şifre</span>
        <input className="min-h-12 w-full rounded-2xl border bg-white px-4 py-3 outline-none transition focus:border-amber-500" value={password} onChange={(event) => setPassword(event.target.value)} type="password" required />
      </label>
      {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      <button className="min-h-14 w-full rounded-2xl bg-stone-900 px-4 py-3 font-medium text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400" disabled={submitting} type="submit">
        {submitting ? 'Giriş yapılıyor…' : 'Giriş yap'}
      </button>
      <p className="text-center text-sm text-stone-600">Hesabın yok mu? <a className="font-medium text-amber-800 hover:text-amber-900" href="/kayit">Kayıt ol</a></p>
    </form>
  );
}
