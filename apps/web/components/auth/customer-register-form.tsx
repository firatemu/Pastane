'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { customerRegisterFormSchema } from '../../lib/auth/customer-form-schemas';

export function CustomerRegisterForm(): React.JSX.Element {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    const parsed = customerRegisterFormSchema.safeParse({ firstName, lastName, phone, email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Kayıt başarısız.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: parsed.data.firstName,
          lastName: parsed.data.lastName,
          phone: parsed.data.phone,
          email: parsed.data.email ? parsed.data.email : undefined,
          password: parsed.data.password,
        }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(payload.message ?? 'Kayıt başarısız.');
        return;
      }
      router.replace('/hesabim');
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="mt-8 grid gap-5 sm:grid-cols-2" noValidate onSubmit={submit}>
      <label className="block space-y-2 text-sm font-medium">
        <span>Ad</span>
        <input className="min-h-12 w-full rounded-2xl border bg-white px-4 py-3 outline-none transition focus:border-amber-500" value={firstName} onChange={(event) => setFirstName(event.target.value)} required />
      </label>
      <label className="block space-y-2 text-sm font-medium">
        <span>Soyad</span>
        <input className="min-h-12 w-full rounded-2xl border bg-white px-4 py-3 outline-none transition focus:border-amber-500" value={lastName} onChange={(event) => setLastName(event.target.value)} required />
      </label>
      <label className="block space-y-2 text-sm font-medium sm:col-span-2">
        <span>Telefon</span>
        <input className="min-h-12 w-full rounded-2xl border bg-white px-4 py-3 outline-none transition focus:border-amber-500" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="905550000099" required />
      </label>
      <label className="block space-y-2 text-sm font-medium sm:col-span-2">
        <span>E-posta (opsiyonel)</span>
        <input className="min-h-12 w-full rounded-2xl border bg-white px-4 py-3 outline-none transition focus:border-amber-500" value={email} onChange={(event) => setEmail(event.target.value)} type="text" inputMode="email" autoComplete="email" />
      </label>
      <label className="block space-y-2 text-sm font-medium sm:col-span-2">
        <span>Şifre</span>
        <input className="min-h-12 w-full rounded-2xl border bg-white px-4 py-3 outline-none transition focus:border-amber-500" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} type="password" required />
      </label>
      {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 sm:col-span-2">{error}</p> : null}
      <button className="min-h-14 rounded-2xl bg-stone-900 px-4 py-3 font-medium text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400 sm:col-span-2" disabled={submitting} type="submit">
        {submitting ? 'Hesap oluşturuluyor…' : 'Hesap oluştur'}
      </button>
      <p className="text-center text-sm text-stone-600 sm:col-span-2">Zaten hesabın var mı? <a className="font-medium text-amber-800 hover:text-amber-900" href="/giris">Giriş yap</a></p>
    </form>
  );
}
