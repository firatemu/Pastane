'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminLoginFormSchema } from '../../lib/auth/admin-login-schema';
import {
  adminMessageFromUnknownError,
  messageFromAdminApiPayload,
  type ParsedAdminApiPayload,
} from '../../lib/messages/admin-facing-errors';

type LoginField = 'phone' | 'password';
type FieldErrors = Partial<Record<LoginField, string>>;

export function LoginForm(): React.JSX.Element {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  function clearFieldError(name: LoginField): void {
    setFieldErrors((current) => {
      if (!current[name]) {
        return current;
      }

      const next = { ...current };
      delete next[name];
      return next;
    });
  }

  function updateField(name: LoginField, value: string): void {
    if (name === 'phone') {
      setPhone(value.replace(/\D/g, '').slice(0, 15));
    } else {
      setPassword(value);
    }

    clearFieldError(name);

    if (error) {
      setError(null);
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const parsed = adminLoginFormSchema.safeParse({ phone: phone.trim(), password });
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors;
      const nextFieldErrors: FieldErrors = {};
      if (fe.phone?.[0]) {
        nextFieldErrors.phone = fe.phone[0];
      }
      if (fe.password?.[0]) {
        nextFieldErrors.password = fe.password[0];
      }
      setFieldErrors(nextFieldErrors);
      setError('Bilgileri kontrol edip tekrar deneyin.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      const payload = (await response.json().catch(() => null)) as ParsedAdminApiPayload | null;
      if (!response.ok) {
        setError(messageFromAdminApiPayload(response.status, payload, 'Giriş başarısız.'));
        return;
      }
      router.replace('/dashboard');
      router.refresh();
    } catch (caughtError) {
      setError(adminMessageFromUnknownError(caughtError, 'Bağlantı kurulamadı. Lütfen tekrar deneyin.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mt-4 space-y-3.5 sm:mt-5 sm:space-y-4">
      <div className="flex items-center gap-2 rounded-full border border-outline-variant/60 bg-surface-container-low px-3 py-1.5 text-[11px] text-on-surface-variant">
        <span className="material-symbols-outlined text-[16px] text-secondary">verified_user</span>
        <span>Yalnızca yetkili hesaplar erişebilir.</span>
      </div>

      <form className="space-y-3.5 sm:space-y-4" onSubmit={onSubmit} noValidate>
        <label className="block space-y-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Telefon numarası</span>
          <div className="relative">
            <span className="material-symbols-outlined pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-outline">
              call
            </span>
            <input
              aria-describedby="admin-login-phone-help"
              aria-invalid={fieldErrors.phone ? 'true' : 'false'}
              autoComplete="username"
              className={`w-full rounded-[0.95rem] border bg-surface-container-lowest px-10 py-2.5 text-sm text-on-surface outline-none transition placeholder:text-outline focus:bg-white focus:ring-4 disabled:cursor-not-allowed disabled:opacity-70 sm:py-3 ${
                fieldErrors.phone
                  ? 'border-error/70 focus:border-error focus:ring-error-container/80'
                  : 'border-outline-variant/70 focus:border-secondary/50 focus:ring-secondary-container/80'
              }`}
              inputMode="numeric"
              onChange={(event) => updateField('phone', event.target.value)}
              placeholder="5321234567"
              type="tel"
              value={phone}
            />
          </div>
          <p className="text-[11px] leading-[1.1rem] text-on-surface-variant" id="admin-login-phone-help">
            Ülke kodu olmadan 10-15 hane girin.
          </p>
          {fieldErrors.phone ? <p className="text-[13px] font-medium text-error">{fieldErrors.phone}</p> : null}
        </label>

        <label className="block space-y-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Şifre</span>
          <div className="relative">
            <span className="material-symbols-outlined pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-outline">
              lock
            </span>
            <input
              aria-invalid={fieldErrors.password ? 'true' : 'false'}
              autoComplete="current-password"
              className={`w-full rounded-[0.95rem] border bg-surface-container-lowest px-10 py-2.5 pr-11 text-sm text-on-surface outline-none transition placeholder:text-outline focus:bg-white focus:ring-4 disabled:cursor-not-allowed disabled:opacity-70 sm:py-3 ${
                fieldErrors.password
                  ? 'border-error/70 focus:border-error focus:ring-error-container/80'
                  : 'border-outline-variant/70 focus:border-secondary/50 focus:ring-secondary-container/80'
              }`}
              onChange={(event) => updateField('password', event.target.value)}
              placeholder="Parolanızı girin"
              type={isPasswordVisible ? 'text' : 'password'}
              value={password}
            />
            <button
              aria-label={isPasswordVisible ? 'Şifreyi gizle' : 'Şifreyi göster'}
              className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-outline transition hover:bg-surface-container-low hover:text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
              onClick={() => setIsPasswordVisible((current) => !current)}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">{isPasswordVisible ? 'visibility_off' : 'visibility'}</span>
            </button>
          </div>
          <p className="text-[11px] leading-[1.1rem] text-on-surface-variant">En az 8 karakter olmalıdır.</p>
          {fieldErrors.password ? <p className="text-[13px] font-medium text-error">{fieldErrors.password}</p> : null}
        </label>

        {error ? (
          <div className="rounded-[0.95rem] border border-error/20 bg-error-container/70 px-3 py-2.5 text-[13px] text-error sm:text-sm" role="alert">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined mt-0.5 text-[18px]">error</span>
              <p className="leading-5 sm:leading-6">{error}</p>
            </div>
          </div>
        ) : null}

        <button
          className="inline-flex w-full items-center justify-center gap-2 rounded-[0.95rem] bg-primary px-4 py-[0.7rem] text-sm font-semibold text-on-secondary shadow-[0_12px_24px_rgba(37,52,70,0.14)] transition hover:bg-primary/95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:cursor-not-allowed disabled:bg-outline disabled:shadow-none sm:py-3"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? (
            <>
              <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-white/25 border-t-white" />
              Giriş yapılıyor...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[18px]">login</span>
              Giriş yap
            </>
          )}
        </button>
      </form>

      <p className="text-[11px] leading-[1.1rem] text-on-surface-variant">
        Başarısız giriş denemeleri kayıt altına alınır. Erişim sorunu yaşıyorsanız sistem yöneticinizle iletişime geçin.
      </p>
    </div>
  );
}
