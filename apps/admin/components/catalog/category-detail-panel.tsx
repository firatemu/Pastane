'use client';

import Link from 'next/link';
import { useEffect, useState, type JSX } from 'react';
import { adminFetch } from '../../lib/api/catalog';
import { adminMessageFromUnknownError } from '../../lib/messages/admin-facing-errors';
import type { Category } from '../../lib/catalog/types';
import { parentName, type CategoryNode } from '../../lib/catalog/category-utils';
import { can } from '../../lib/permissions/can';
import { CategoryStatusPill } from './category-status-pill';
import { adminPrimaryButtonClass, adminSecondaryButtonClass } from '../shared/admin-form-controls';
import { ErrorState, LoadingState } from '../shared/async-state';

interface CategoryDetail extends Category {
  children: Category[];
  products: Array<{ id: string; name: string; status: string }>;
}

export function CategoryDetailPanel({
  category,
  flat,
  permissions,
  onEdit,
  onClose,
  onDeleted,
  onAddChild,
}: Readonly<{
  category: CategoryNode;
  flat: CategoryNode[];
  permissions: string[];
  onEdit: () => void;
  onClose: () => void;
  onDeleted: () => Promise<void>;
  onAddChild?: (parentId: string) => void;
}>): JSX.Element {
  const [detail, setDetail] = useState<CategoryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const parent = parentName(flat, category.parentId);

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

  async function copySlug(): Promise<void> {
    try {
      await navigator.clipboard.writeText(category.slug);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

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

  const productCount = detail?.products.length ?? 0;

  return (
    <section className="rounded-card border border-outline-variant/35 bg-surface-container-lowest shadow-bakery">
      <header className="flex flex-col gap-4 border-b border-outline-variant/30 p-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-surface-container text-secondary">
            {category.imageUrl ? (
              <img src={category.imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="material-symbols-outlined text-[40px]">category</span>
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-2xl font-semibold tracking-tight text-on-surface">{category.name}</h2>
              <CategoryStatusPill isActive={category.isActive} />
            </div>
            {parent ? <p className="mt-1 text-sm text-on-surface-variant">Üst: {parent}</p> : null}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="rounded-lg bg-surface-container-low px-2 py-1 font-mono text-sm text-on-surface-variant">{category.slug}</code>
              <button type="button" className="text-xs font-semibold text-secondary hover:underline" onClick={() => void copySlug()}>
                {copied ? 'Kopyalandı' : 'Slug kopyala'}
              </button>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {can(permissions, ['categories.update']) ? (
            <button type="button" className={adminSecondaryButtonClass} onClick={onEdit}>
              <span className="material-symbols-outlined text-[20px]">edit</span>
              Düzenle
            </button>
          ) : null}
          {can(permissions, ['categories.delete']) ? (
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

      <div className="space-y-6 p-6">
        {error ? <ErrorState message={error} /> : null}
        {loading ? (
          <LoadingState label="Detay yükleniyor…" />
        ) : (
          <>
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
                    <li key={child.id} className="rounded-full border border-outline-variant/50 bg-surface-container-low px-3 py-1 text-sm font-medium text-on-surface">
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
              {can(permissions, ['categories.create']) && onAddChild ? (
                <button type="button" className={adminSecondaryButtonClass} onClick={() => onAddChild(category.id)}>
                  <span className="material-symbols-outlined text-[20px]">subdirectory_arrow_right</span>
                  Alt kategori ekle
                </button>
              ) : null}
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
          </>
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

