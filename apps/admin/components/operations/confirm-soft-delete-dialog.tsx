'use client';

import type { JSX } from 'react';
import {
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
} from '../shared/admin-form-controls';

export function ConfirmSoftDeleteDialog({
  open,
  title,
  description,
  busy = false,
  confirmLabel = 'Hesabı kaldır',
  onClose,
  onConfirm,
}: Readonly<{
  open: boolean;
  title: string;
  description: string;
  busy?: boolean;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}>): JSX.Element | null {
  if (!open) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        aria-label="Silme onayını kapat"
        className="fixed inset-0 z-[80] bg-chocolate/35 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
        <section
          className="w-full max-w-lg rounded-card border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-[0_24px_48px_rgba(61,43,31,0.18)]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="soft-delete-title"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-error-container text-error">
              <span className="material-symbols-outlined text-[24px]">warning</span>
            </div>
            <div className="min-w-0">
              <h2 id="soft-delete-title" className="font-display text-xl font-semibold text-on-surface">
                {title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">{description}</p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-outline-variant/35 bg-surface-container-low px-4 py-3 text-xs leading-5 text-on-surface-variant">
            Soft delete uygulanır: hesap listelerden kaldırılır, oturumları kapatılır ve geçmiş sipariş/denetim
            kayıtları korunur.
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              className={`${adminSecondaryButtonClass} flex-1`}
              onClick={onClose}
              disabled={busy}
            >
              Vazgeç
            </button>
            <button
              type="button"
              className={`${adminPrimaryButtonClass} flex-1 bg-error text-white hover:bg-error/90`}
              onClick={() => void onConfirm()}
              disabled={busy}
            >
              <span className={`material-symbols-outlined text-[18px] ${busy ? 'animate-spin' : ''}`}>
                {busy ? 'progress_activity' : 'delete'}
              </span>
              {busy ? 'Kaldırılıyor…' : confirmLabel}
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
