'use client';

import { useEffect, useMemo, useState, type JSX } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { adminFetch } from '../../lib/api/catalog';
import { adminMessageFromUnknownError } from '../../lib/messages/admin-facing-errors';
import { categorySchema } from '../../lib/catalog/schemas';
import type { Category } from '../../lib/catalog/types';
import {
  blockedParentIds,
  countCategoryStats,
  filterCategoryTree,
  flattenCategories,
  type CategoryNode,
} from '../../lib/catalog/category-utils';
import { can } from '../../lib/permissions/can';
import { ErrorState, LoadingState } from '../shared/async-state';
import { adminInputClass, adminPrimaryButtonClass, adminSelectClass } from '../shared/admin-form-controls';
import { CategoriesList, type CategoryViewMode } from './categories-list';
import { CategoriesStatsBar } from './categories-stats-bar';
import { CategoryDetailModal } from './category-detail-modal';
import { CategoryFormSheet } from './category-form-sheet';

type Form = z.input<typeof categorySchema>;

const emptyForm: Form = {
  name: '',
  description: '',
  imageUrl: '',
  parentId: '',
  sortOrder: 0,
  isActive: true,
};

export function CategoriesManager({ permissions }: { permissions: string[] }): JSX.Element {
  const [tree, setTree] = useState<CategoryNode[]>([]);
  const [selected, setSelected] = useState<CategoryNode | null>(null);
  const [editing, setEditing] = useState<CategoryNode | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | 'active' | 'inactive'>('');
  const [viewMode, setViewMode] = useState<CategoryViewMode>('tree');

  const form = useForm<Form>({
    resolver: zodResolver(categorySchema),
    defaultValues: emptyForm,
  });

  const canCreate = can(permissions, ['categories.create']);
  const canUpdate = can(permissions, ['categories.update']);
  const canEdit = canCreate || canUpdate;

  const flat = useMemo(() => flattenCategories(tree), [tree]);
  const stats = useMemo(() => countCategoryStats(flat), [flat]);

  async function load(): Promise<void> {
    try {
      setError(null);
      const data = await adminFetch<CategoryNode[]>('/categories');
      setTree(data);
      setSelected((prev) => (prev ? flattenCategories(data).find((c) => c.id === prev.id) ?? null : null));
    } catch (caught) {
      setError(adminMessageFromUnknownError(caught, 'Kategoriler yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filteredTree = useMemo(() => {
    const q = search.trim().toLowerCase();
    return filterCategoryTree(tree, (c) => {
      if (statusFilter === 'active' && !c.isActive) return false;
      if (statusFilter === 'inactive' && c.isActive) return false;
      if (!q) return true;
      return c.name.toLowerCase().includes(q) || (c.description?.toLowerCase().includes(q) ?? false);
    });
  }, [tree, search, statusFilter]);

  const parentOptions = useMemo(() => {
    const blocked = blockedParentIds(tree, editing?.id ?? null);
    return flat.filter((c) => !blocked.has(c.id));
  }, [flat, tree, editing?.id]);

  async function submit(values: Form): Promise<void> {
    try {
      setError(null);
      const body = { ...values, parentId: values.parentId || undefined, imageUrl: values.imageUrl || undefined };
      await adminFetch<Category>(`/categories${editing ? `/${editing.id}` : ''}`, {
        method: editing ? 'PATCH' : 'POST',
        body: JSON.stringify(body),
      });
      setEditing(null);
      setFormOpen(false);
      form.reset(emptyForm);
      await load();
    } catch (caught) {
      setError(adminMessageFromUnknownError(caught, 'Kategori kaydedilemedi.'));
    }
  }

  function openCreate(parentId?: string): void {
    setEditing(null);
    form.reset({ ...emptyForm, parentId: parentId ?? '' });
    setFormOpen(true);
  }

  function openEdit(category: CategoryNode): void {
    setSelected(null);
    setEditing(category);
    form.reset({
      name: category.name,
      description: category.description ?? '',
      imageUrl: category.imageUrl ?? '',
      parentId: category.parentId ?? '',
      sortOrder: category.sortOrder,
      isActive: category.isActive,
    });
    setFormOpen(true);
  }

  function closeForm(): void {
    setFormOpen(false);
    setEditing(null);
    form.reset(emptyForm);
  }

  return (
    <section className="space-y-stack-md">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-on-surface">Kategoriler</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-on-surface-variant">
          Menü hiyerarşinizi ağaç veya kart görünümünde yönetin.
        </p>
      </header>

      {loading ? (
        <LoadingState label="Kategoriler yükleniyor…" />
      ) : error && tree.length === 0 ? (
        <ErrorState message={error} />
      ) : (
        <div className="space-y-stack-md">
          {error ? <ErrorState message={error} /> : null}

          <CategoriesStatsBar total={stats.total} active={stats.active} roots={stats.roots} withChildren={stats.withChildren} />

          <div className="flex flex-col gap-3 rounded-card border border-outline-variant/35 bg-surface-container-lowest p-4 shadow-bakery lg:flex-row lg:items-end lg:justify-between">
            <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="block space-y-1.5 text-sm font-medium text-on-surface">
                <span className="text-on-surface-variant">Ara</span>
                <div className="relative">
                  <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-outline">search</span>
                  <input
                    className={`${adminInputClass} pl-10`}
                    placeholder="Ad veya açıklama…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </label>
              <label className="block space-y-1.5 text-sm font-medium text-on-surface">
                <span className="text-on-surface-variant">Durum</span>
                <select className={adminSelectClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as '' | 'active' | 'inactive')}>
                  <option value="">Tümü</option>
                  <option value="active">Aktif</option>
                  <option value="inactive">Pasif</option>
                </select>
              </label>
              <label className="block space-y-1.5 text-sm font-medium text-on-surface">
                <span className="text-on-surface-variant">Görünüm</span>
                <div className="flex rounded-xl border border-outline-variant/60 bg-surface-container-low p-1">
                  <ViewToggle active={viewMode === 'tree'} onClick={() => setViewMode('tree')} icon="account_tree" label="Ağaç" />
                  <ViewToggle active={viewMode === 'grid'} onClick={() => setViewMode('grid')} icon="grid_view" label="Kart" />
                </div>
              </label>
            </div>
            {canCreate ? (
              <button type="button" className={`${adminPrimaryButtonClass} shrink-0`} onClick={() => openCreate()}>
                <span className="material-symbols-outlined text-[20px]">add</span>
                Yeni kategori
              </button>
            ) : null}
          </div>

          <p className="text-sm text-on-surface-variant">
            {filteredTree.length === tree.length && flat.length === stats.total
              ? `${stats.total} kategori`
              : `Filtrelenmiş · ${flattenCategories(filteredTree).length} / ${stats.total} kategori`}
          </p>

          <CategoriesList
            tree={filteredTree}
            viewMode={viewMode}
            selectedId={selected?.id ?? null}
            onSelect={setSelected}
            onEdit={openEdit}
            canEdit={canUpdate}
          />
        </div>
      )}

      <CategoryDetailModal
        category={selected}
        flat={flat}
        permissions={permissions}
        onEdit={() => {
          if (!selected) return;
          const cat = selected;
          setSelected(null);
          openEdit(cat);
        }}
        onClose={() => setSelected(null)}
        onDeleted={load}
      />

      {canEdit ? (
        <CategoryFormSheet
          open={formOpen}
          editing={editing}
          form={form}
          parentOptions={parentOptions}
          onClose={closeForm}
          onSubmit={submit}
        />
      ) : null}
    </section>
  );
}

function ViewToggle({ active, onClick, icon, label }: Readonly<{ active: boolean; onClick: () => void; icon: string; label: string }>): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
        active ? 'bg-surface-container-lowest text-secondary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
      }`}
    >
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
      {label}
    </button>
  );
}