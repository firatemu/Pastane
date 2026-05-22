'use client';

import Link from 'next/link';
import { useEffect, useState, type JSX } from 'react';
import type { Category } from '../../lib/catalog/types';
import type { CategoryNode } from '../../lib/catalog/category-utils';
import { can } from '../../lib/permissions/can';
import { adminFetch } from '../../lib/api/catalog';
import { adminMessageFromUnknownError } from '../../lib/messages/admin-facing-errors';
import { CategoryStatusPill } from './category-status-pill';
import { adminPrimaryButtonClass, adminSecondaryButtonClass } from '../shared/admin-form-controls';
import { ErrorState, LoadingState } from '../shared/async-state';

interface CategoryDetail extends Category {
  children: Category[];
  products: Array<{ id: string; name: string; status: string }>;
}

function getParentName(flat: CategoryNode[], parentId: string | null): string | null {
  if (!parentId) return null;
  return flat.find((c) => c.id === parentId)?.name ?? null;
}

export function CategoryDetailTabs({
  category,
  flat,
  permissions,
  onEdit,
  onClose,
  onDeleted,
  readOnly = false,
}: Readonly<{
  category: CategoryNode;
  flat: CategoryNode[];
  permissions: string[];
  onEdit: () => void;
  onClose: () => void;
  onDeleted: () => Promise<void>;
  readOnly?: boolean;
}>): JSX.Element {
  const [detail, setDetail] = useState<CategoryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const parent = getParentName(flat, category.parentId);
  const productCount = detail?.products.length ?? 0;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await adminFetch<CategoryDetail>(`/categories/${category.id}`);
        if (!cancelled) setDetail(data);
      } catch (caught) {
        if (!cancelled) setError(adminMessageFromUnknownError(caught, 'Kategori detayı yüklenemedi.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [category.id]);

  async function remove(): Promise<void> {
    if (!window.confirm(`"${category.name}" kategorisini silmek istediğinize emin misiniz?`)) return;
    try {
      setDeleting(true);
      setError(null);
      await adminFetch(`/categories/${category.id}`, { method: 'DELETE' });
      await onDeleted();
      onClose();
    } catch (caught) {
      setError(adminMessageFromUnknownError(caught, 'Kategori silinemedi.'));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-card bg-surface-container-lowest">
      {readOnly ? (
        <p className="border-b border-outline-variant/25 bg-surface-container-low px-6 py-2 text-center text-xs font-medium text-on-surface-variant">
          İnceleme modu — değişiklik için Düzenle&apos;ye tıklayın
        </p>
      ) : null}

      <header className="flex flex-col gap-4 border-b border-outline-variant/30 p-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-surface-container text-secondary">
            {category.imageUrl ? (
              <img src={category.imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="material-symbols-outlined text-[36px]">category</span>
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="category-detail-title" className="font-display text-2xl font-semibold tracking-tight text-on-surface">
                {category.name}
              </h2>
              <CategoryStatusPill isActive={category.isActive} />
            </div>
            {parent ? <p className="mt-1 text-sm text-on-surface-variant">Üst: {parent}</p> : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {can(permissions, ['categories.update']) ? (
            <button type="button" className={adminSecondaryButtonClass} onClick={onEdit}>
              <span className="material-symbols-outlined text-[20px]">edit</span>
              Düzenle
            </button>
          ) : null}
          {!readOnly && can(permissions, ['categories.delete']) ? (
            <button type="button" className={adminSecondaryButtonClass} disabled={deleting} onClick={() => void remove()}>
              <span className="material-symbols-outlined text-[20px]">delete</span>
              {deleting ? 'Siliniyor…' : 'Sil'}
            </button>
          ) : null}
          <button type="button" className={adminSecondaryButtonClass} onClick={onClose} aria-label="Kapat">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        {error ? <ErrorState message={error} /> : null}
        {loading ? (
          <LoadingState label="Detay yükleniyor…" />
        ) : (
          <div className="space-y-6">
            {category.description ? (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Açıklama</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-on-surface">{category.description}</p>
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-3">
              <StatChip label="Sıra" value={String(category.sortOrder)} />
              <StatChip label="Alt kategori" value={String(detail?.children.length ?? category.children?.length ?? 0)} />
              <StatChip label="Ürün" value={String(productCount)} />
            </div>

            {(detail?.children.length ?? 0) > 0 ? (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Alt kategoriler</h3>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {detail!.children.map((child) => (
                    <li
                      key={child.id}
                      className="rounded-full border border-outline-variant/50 bg-surface-container-low px-3 py-1 text-sm font-medium text-on-surface"
                    >
                      {child.name}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <Link href={`/products?categoryId=${category.id}`} className={adminPrimaryButtonClass}>
                <span className="material-symbols-outlined text-[20px]">inventory_2</span>
                Ürünleri görüntüle
                {productCount > 0 ? ` (${productCount})` : ''}
              </Link>
            </div>

            {productCount > 0 && detail ? (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Bu kategorideki ürünler</h3>
                <ul className="mt-2 divide-y divide-outline-variant/20 rounded-xl border border-outline-variant/30">
                  {detail.products.slice(0, 8).map((p) => (
                    <li key={p.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                      <span className="font-medium text-on-surface">{p.name}</span>
                      <span className="text-xs text-on-surface-variant">{p.status}</span>
                    </li>
                  ))}
                </ul>
                {productCount > 8 ? (
                  <p className="mt-2 text-xs text-on-surface-variant">+{productCount - 8} ürün daha…</p>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}

function StatChip({ label, value }: Readonly<{ label: string; value: string }>): JSX.Element {
  return (
    <div className="rounded-xl border border-outline-variant/35 bg-surface-container-low px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{label}</p>
      <p className="mt-1 font-display text-xl font-semibold text-on-surface">{value}</p>
    </div>
  );
}
