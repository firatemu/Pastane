'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { courierLoginFormSchema } from '../../lib/auth/courier-login-schema';
import { courierMessageFromPayload, type ParsedCourierApiPayload } from '../../lib/deliveries/courier-api-error';

export function CourierLoginForm(): React.JSX.Element {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState<{ phone: boolean; password: boolean }>({
    phone: false,
    password: false,
  });

  function validateField(field: 'phone' | 'password', value: string): string | null {
    const singleField =
      field === 'phone'
        ? courierLoginFormSchema.shape.phone.safeParse(value.trim())
        : courierLoginFormSchema.shape.password.safeParse(value);
    if (!singleField.success) {
      return singleField.error.issues[0]?.message ?? 'Geçersiz değer.';
    }
    return null;
  }

  const phoneError = touched.phone ? validateField('phone', phone) : null;
  const passwordError = touched.password ? validateField('password', password) : null;

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setTouched({ phone: true, password: true });

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
    <form className="space-y-5" onSubmit={submit} noValidate>
      {/* Telefon */}
      <div className="space-y-1.5">
        <label htmlFor="phone" className="block text-sm font-medium text-stone-700">
          Telefon Numarası
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
            <svg className="h-5 w-5 text-stone-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z"
              />
            </svg>
          </div>
          <input
            id="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="username"
            placeholder="5550000004"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, phone: true }))}
            className={`block w-full rounded-xl border bg-white py-3 pl-11 pr-4 text-sm text-stone-900 outline-none transition
              placeholder:text-stone-400
              focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20
              ${phoneError ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : 'border-stone-300 hover:border-stone-400'}
            `}
          />
        </div>
        {phoneError ? <p className="text-xs text-red-600">{phoneError}</p> : null}
      </div>

      {/* Şifre */}
      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-medium text-stone-700">
          Şifre
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
            <svg className="h-5 w-5 text-stone-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
              />
            </svg>
          </div>
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
            className={`block w-full rounded-xl border bg-white py-3 pl-11 pr-11 text-sm text-stone-900 outline-none transition
              placeholder:text-stone-400
              focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20
              ${passwordError ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : 'border-stone-300 hover:border-stone-400'}
            `}
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-stone-400 transition hover:text-stone-600"
            aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
          >
            {showPassword ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
            )}
          </button>
        </div>
        {passwordError ? <p className="text-xs text-red-600">{passwordError}</p> : null}
      </div>

      {/* Genel hata mesajı */}
      {error ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <svg className="mt-0.5 h-4.5 w-4.5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      ) : null}

      {/* Giriş butonu */}
      <button
        type="submit"
        disabled={submitting}
        className="relative flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition
          hover:bg-amber-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600
          disabled:cursor-not-allowed disabled:bg-stone-300 disabled:shadow-none"
      >
        {submitting ? (
          <>
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z" />
            </svg>
            Giriş yapılıyor…
          </>
        ) : (
          <>
            <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
            </svg>
            Giriş Yap
          </>
        )}
      </button>
    </form>
  );
}