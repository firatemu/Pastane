'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Profile } from '../../lib/account/types';
import { customerFacingMessageFromUnknownError, messageFromCustomerApiPayload, type ParsedCustomerApiPayload } from '../../lib/messages/customer-facing-errors';

type ApiPayload<T> = ParsedCustomerApiPayload & { data?: T };

export function ProfileForms({ profile }: Readonly<{ profile: Profile }>): React.JSX.Element {
  const router = useRouter();
  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [email, setEmail] = useState(profile.email ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setBusy(true); setProfileMessage(null);
    try {
      const response = await fetch('/api/users/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ firstName, lastName, email: email || undefined }) });
      const payload = await response.json() as ApiPayload<Profile>;
      if (!response.ok || !payload.data) throw new Error(messageFromCustomerApiPayload(response.status, payload, 'Profil güncellenemedi.'));
      setProfileMessage('Profil bilgileri güncellendi.');
      router.refresh();
    } catch (error) { setProfileMessage(customerFacingMessageFromUnknownError(error, 'Profil güncellenemedi.')); }
    finally { setBusy(false); }
  }

  async function changePassword(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setBusy(true); setPasswordMessage(null);
    try {
      const response = await fetch('/api/users/me/password', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword, newPassword }) });
      const payload = await response.json() as ApiPayload<{ changed: true }>;
      if (!response.ok || !payload.data) throw new Error(messageFromCustomerApiPayload(response.status, payload, 'Şifre değiştirilemedi.'));
      setCurrentPassword(''); setNewPassword(''); setPasswordMessage('Şifre güncellendi.');
    } catch (error) { setPasswordMessage(customerFacingMessageFromUnknownError(error, 'Şifre değiştirilemedi.')); }
    finally { setBusy(false); }
  }

  return <div className="grid gap-5 lg:grid-cols-2">
    <form className="rounded-[2rem] border border-amber-200/70 bg-white p-5 shadow-sm" onSubmit={saveProfile}>
      <h2 className="text-lg font-semibold">Profil bilgileri</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm"><span>Ad</span><input className="w-full rounded-2xl border px-4 py-3" value={firstName} onChange={e => setFirstName(e.target.value)} required /></label>
        <label className="space-y-1 text-sm"><span>Soyad</span><input className="w-full rounded-2xl border px-4 py-3" value={lastName} onChange={e => setLastName(e.target.value)} required /></label>
      </div>
      <label className="mt-3 block space-y-1 text-sm"><span>E-posta</span><input className="w-full rounded-2xl border px-4 py-3" type="text" inputMode="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></label>
      {profileMessage ? <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-stone-700">{profileMessage}</p> : null}
      <button className="mt-4 rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-white disabled:opacity-60" disabled={busy} type="submit">Profili kaydet</button>
    </form>
    <form className="rounded-[2rem] border border-amber-200/70 bg-white p-5 shadow-sm" onSubmit={changePassword}>
      <h2 className="text-lg font-semibold">Şifre değiştir</h2>
      <label className="mt-4 block space-y-1 text-sm"><span>Mevcut şifre</span><input className="w-full rounded-2xl border px-4 py-3" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required /></label>
      <label className="mt-3 block space-y-1 text-sm"><span>Yeni şifre</span><input className="w-full rounded-2xl border px-4 py-3" minLength={8} type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required /></label>
      {passwordMessage ? <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-stone-700">{passwordMessage}</p> : null}
      <button className="mt-4 rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-white disabled:opacity-60" disabled={busy} type="submit">Şifreyi güncelle</button>
    </form>
  </div>;
}
