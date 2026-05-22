'use client';

import { useEffect, type JSX } from 'react';
import type { CategoryNode } from '../../lib/catalog/category-utils';
import { CategoryDetailTabs } from './category-detail-tabs';

export function CategoryDetailModal({
  category,
  flat,
  permissions,
  onEdit,
  onClose,
  onDeleted,
}: Readonly<{
  category: CategoryNode | null;
  flat: CategoryNode[];
  permissions: string[];
  onEdit: () => void;
  onClose: () => void;
  onDeleted: () => Promise<void>;
}>): JSX.Element | null {
  useEffect(() => {
    if (!category) return;
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
  }, [category, onClose]);

  if (!category) return null;

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
        aria-labelledby="category-detail-title"
      >
        <div
          className="pointer-events-auto flex w-full max-w-3xl max-h-[min(90vh,720px)] flex-col overflow-hidden rounded-card border border-outline-variant/40 bg-surface-container-lowest shadow-[0_24px_48px_rgba(61,43,31,0.18)]"
          onClick={(e) => e.stopPropagation()}
          role="document"
        >
          <CategoryDetailTabs
            key={category.id}
            category={category}
            flat={flat}
            permissions={permissions}
            onEdit={onEdit}
            onClose={onClose}
            onDeleted={onDeleted}
            readOnly
          />
        </div>
      </div>
    </>
  );
}
