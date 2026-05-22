'use client';

import { type JSX } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { z } from 'zod';
import type { adminUserUpdateSchema } from '../../lib/operations/schemas';
import type { AdminRoleRow, AdminUserRow } from '../../lib/operations/types';
import { Field } from '../shared/form-field';
import {
  adminInputClass,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
  adminSelectClass,
} from '../shared/admin-form-controls';

type UserForm = z.infer<typeof adminUserUpdateSchema>;

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Sistem Yöneticisi',
  ORDER_OPERATOR: 'Operasyon Sorumlusu',
  PRODUCT_MANAGER: 'Ürün Yöneticisi',
  COURIER: 'Kurye',
  CUSTOMER: 'Müşteri',
};

const ROLE_HINTS: Record<string, string> = {
  ADMIN: 'Tüm yönetim paneline erişir.',
  ORDER_OPERATOR: 'Sipariş ve operasyon süreçlerini yönetir.',
  PRODUCT_MANAGER: 'Katalog ve ürün içeriklerini yönetir.',
  COURIER: 'Kendi teslimat operasyonunu yürütür.',
  CUSTOMER: 'Müşteri hesabı yetkileriyle işlem yapar.',
};

function roleLabel(roleName: string): string {
  return ROLE_LABELS[roleName] ?? roleName;
}

export function UserFormSheet({
  open,
  editing,
  form,
  roleOptions,
  onClose,
  onSubmit,
}: Readonly<{
  open: boolean;
  editing: AdminUserRow | null;
  form: UseFormReturn<UserForm>;
  roleOptions: string[];
  onClose: () => void;
  onSubmit: (values: UserForm) => Promise<void>;
}>): JSX.Element | null {
  if (!open || !editing) return null;

  const currentRole = form.watch('roleName') ?? editing.role.name;

  return (
    <>
      <button
        type="button"
        aria-label="Formu kapat"
        className="fixed inset-0 z-[60] bg-chocolate/25 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <aside
        className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col border-l border-outline-variant bg-surface-container-lowest shadow-[0_0_40px_rgba(61,43,31,0.12)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-form-title"
      >
        <header className="flex items-start justify-between gap-3 border-b border-outline-variant/40 px-6 py-5">
          <div>
            <h2 id="user-form-title" className="font-display text-xl font-semibold text-on-surface">
              Kullanıcı Düzenle
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Değişiklikler kaydedildiğinde sistem yetkileri ve profil bilgileri güncellenir.
            </p>
          </div>
          <button
            type="button"
            className="rounded-full p-2 text-on-surface-variant transition hover:bg-surface-container"
            onClick={onClose}
            aria-label="Kapat"
          >
            <span className="material-symbols-outlined text-[24px]">close</span>
          </button>
        </header>

        <form className="flex flex-1 flex-col overflow-hidden" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 space-y-4">
            <div className="rounded-xl bg-surface-container-low p-3.5 space-y-1">
              <div className="text-sm font-semibold text-on-surface">
                {editing.firstName} {editing.lastName}
              </div>
              {editing.phone && (
                <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                  <span className="material-symbols-outlined text-[14px]">call</span>
                  <span>{editing.phone}</span>
                </div>
              )}
              <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-container px-2 py-0.5 text-[10px] font-semibold text-primary mt-1">
                <span className="material-symbols-outlined text-[11px]">shield</span>
                <span>{roleLabel(editing.role.name)}</span>
              </div>
            </div>

            <Field label="Ad" error={form.formState.errors.firstName?.message}>
              <input className={adminInputClass} {...form.register('firstName')} />
            </Field>
            <Field label="Soyad" error={form.formState.errors.lastName?.message}>
              <input className={adminInputClass} {...form.register('lastName')} />
            </Field>
            <Field label="E-posta" error={form.formState.errors.email?.message}>
              <input className={adminInputClass} type="email" {...form.register('email')} />
            </Field>
            <Field label="Durum" error={form.formState.errors.status?.message}>
              <select className={adminSelectClass} {...form.register('status')}>
                <option value="ACTIVE">Aktif</option>
                <option value="INACTIVE">Pasif</option>
                <option value="BANNED">Yasaklı</option>
              </select>
            </Field>
            <Field label="Rol ve yetki seti" error={form.formState.errors.roleName?.message}>
              <select className={adminSelectClass} {...form.register('roleName')}>
                {roleOptions.map((roleName) => (
                  <option key={roleName} value={roleName}>
                    {roleLabel(roleName)}
                  </option>
                ))}
              </select>
            </Field>

            <div className="rounded-xl border border-outline-variant/35 bg-surface-container-low px-3.5 py-3 text-xs leading-relaxed text-on-surface-variant">
              <div className="mb-1 flex items-center gap-1.5 font-semibold text-on-surface">
                <span className="material-symbols-outlined text-[15px]">admin_panel_settings</span>
                Yetki etkisi
              </div>
              {ROLE_HINTS[currentRole] ?? 'Seçilen rolün yetkileri uygulanır.'}
            </div>
          </div>

          <footer className="flex gap-3 border-t border-outline-variant/40 px-6 py-4">
            <button type="button" className={`${adminSecondaryButtonClass} flex-1`} onClick={onClose}>
              Vazgeç
            </button>
            <button type="submit" className={`${adminPrimaryButtonClass} flex-1`} disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <>
                  <span className="animate-spin material-symbols-outlined text-[18px]">progress_activity</span>
                  Kaydediliyor...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  Kaydet
                </>
              )}
            </button>
          </footer>
        </form>
      </aside>
    </>
  );
}
