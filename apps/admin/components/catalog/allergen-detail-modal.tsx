'use client';

import { useEffect } from 'react';
import type { JSX } from 'react';
import type { AllergenResponse } from './allergens-manager';

function getAllergenIcon(name: string): string {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('gluten')) return '🌾';
  if (lowerName.includes('süt') || lowerName.includes('laktoz')) return '🥛';
  if (lowerName.includes('yumurta')) return '🥚';
  if (lowerName.includes('fındık')) return '🌰';
  if (lowerName.includes('fıstık')) return '🥜';
  if (lowerName.includes('ceviz')) return '🌳';
  if (lowerName.includes('susam')) return '🫘';
  if (lowerName.includes('soya')) return '🫘';
  if (lowerName.includes('balık')) return '🐟';
  if (lowerName.includes('kabuk')) return '🦐';
  return '⚠️';
}

export function AllergenDetailModal({
  allergen,
  onEdit,
  onClose,
}: Readonly<{
  allergen: AllergenResponse | null;
  onEdit: () => void;
  onClose: () => void;
}>): JSX.Element | null {
  useEffect(() => {
    if (!allergen) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [allergen, onClose]);

  if (!allergen) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Detayı kapat"
        className="fixed inset-0 z-[50] bg-chocolate/30 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        className="fixed inset-0 z-[50] flex items-center justify-center p-4 sm:p-6"
        role="dialog"
        aria-modal="true"
      >
        <div
          className="pointer-events-auto w-full max-w-sm overflow-hidden rounded-card border border-outline-variant/40 bg-surface-container-lowest shadow-[0_24px_48px_rgba(61,43,31,0.18)]"
          onClick={(e) => e.stopPropagation()}
          role="document"
        >
          <p className="border-b border-outline-variant/25 bg-surface-container-low px-6 py-2 text-center text-xs font-medium text-on-surface-variant">
            İnceleme modu — değişiklik için Düzenle&apos;ye tıklayın
          </p>

          <div className="flex flex-col items-center px-6 py-8 text-center">
            <span className="text-6xl">{allergen.icon ?? getAllergenIcon(allergen.name)}</span>
            <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight text-on-surface">{allergen.name}</h2>
            <p className="mt-2 text-sm text-on-surface-variant">ID: {allergen.id.substring(0, 8)}…</p>
            <div className="mt-4 flex gap-2">
              <span className="rounded-full bg-secondary-container px-3 py-1 text-xs font-semibold text-secondary">Aktif</span>
              <span className="rounded-full bg-tertiary-container px-3 py-1 text-xs font-semibold text-tertiary">
                {(allergen as AllergenResponse & { productCount?: number }).productCount ?? 0} ürün
              </span>
            </div>
          </div>

          <div className="flex gap-3 border-t border-outline-variant/30 px-6 py-4">
            <button
              type="button"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-2.5 text-sm font-semibold text-on-surface transition hover:bg-surface-container-low"
              onClick={onClose}
            >
              Kapat
            </button>
            <button
              type="button"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-chocolate px-4 py-2.5 text-sm font-semibold text-surface-container-lowest transition hover:bg-secondary"
              onClick={onEdit}
            >
              <span className="material-symbols-outlined text-[18px]">edit</span>
              Düzenle
            </button>
          </div>
        </div>
      </div>
    </>
  );
}