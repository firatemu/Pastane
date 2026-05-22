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
    <form className="mt-10 grid gap-6 sm:grid-cols-2" noValidate onSubmit={submit}>
      <label className="block space-y-2 text-sm font-medium">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Ad</span>
        <input className="stitch-input" value={firstName} onChange={(event) => setFirstName(event.target.value)} required />
      </label>
      <label className="block space-y-2 text-sm font-medium">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Soyad</span>
        <input className="stitch-input" value={lastName} onChange={(event) => setLastName(event.target.value)} required />
      </label>
      <label className="block space-y-2 text-sm font-medium sm:col-span-2">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Telefon</span>
        <input className="stitch-input" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="905550000099" required />
      </label>
      <label className="block space-y-2 text-sm font-medium sm:col-span-2">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted">E-posta (opsiyonel)</span>
        <input className="stitch-input" value={email} onChange={(event) => setEmail(event.target.value)} type="text" inputMode="email" autoComplete="email" />
      </label>
      <label className="block space-y-2 text-sm font-medium sm:col-span-2">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Şifre</span>
        <input className="stitch-input" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} type="password" required />
      </label>
      {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 sm:col-span-2">{error}</p> : null}
      <button className="stitch-button min-h-14 disabled:cursor-not-allowed disabled:bg-muted sm:col-span-2" disabled={submitting} type="submit">
        {submitting ? 'Hesap oluşturuluyor...' : 'Hesap oluştur'}
      </button>
      <p className="text-center text-sm text-muted sm:col-span-2">Zaten hesabın var mı? <a className="font-semibold text-primary hover:text-secondary" href="/giris">Giriş yap</a></p>
    </form>
  );
}
