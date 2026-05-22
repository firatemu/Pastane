'use client';

import { Fragment, useState, type CSSProperties, type JSX, type MouseEvent } from 'react';
import type { CategoryNode } from '../../lib/catalog/category-utils';
import { CategoryStatusPill } from './category-status-pill';

export type CategoryViewMode = 'tree' | 'grid';

function CategoryThumb({ category }: Readonly<{ category: CategoryNode }>): JSX.Element {
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-container text-secondary">
      {category.imageUrl ? (
        <img src={category.imageUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="material-symbols-outlined text-[22px]">category</span>
      )}
    </div>
  );
}

function TreeRows({
  nodes,
  depth,
  selectedId,
  expandedIds,
  onToggleExpand,
  onSelect,
  onEdit,
  canEdit,
}: Readonly<{
  nodes: CategoryNode[];
  depth: number;
  selectedId: string | null;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onSelect: (c: CategoryNode) => void;
  onEdit: (c: CategoryNode) => void;
  canEdit: boolean;
}>): JSX.Element {
  const indent: CSSProperties = { paddingLeft: `${depth * 1.25}rem` };

  return (
    <>
      {nodes.map((category) => {
        const hasChildren = (category.children?.length ?? 0) > 0;
        const expanded = expandedIds.has(category.id);
        const selected = selectedId === category.id;
        const childCount = category.children?.length ?? 0;

        return (
          <Fragment key={category.id}>
            <tr
              className={`cursor-pointer transition ${selected ? 'bg-secondary-container/25' : 'hover:bg-surface-variant/35'}`}
              onClick={() => onSelect(category)}
            >
              <td className="py-3 pr-4">
                <div className="flex items-center gap-2" style={indent}>
                  {hasChildren ? (
                    <button
                      type="button"
                      className="rounded-full p-0.5 text-on-surface-variant hover:bg-surface-container"
                      aria-label={expanded ? 'Daralt' : 'Genişlet'}
                      onClick={(e: MouseEvent) => {
                        e.stopPropagation();
                        onToggleExpand(category.id);
                      }}
                    >
                      <span className="material-symbols-outlined text-[20px]">{expanded ? 'expand_more' : 'chevron_right'}</span>
                    </button>
                  ) : (
                    <span className="inline-block w-6" aria-hidden />
                  )}
                  <CategoryThumb category={category} />
                  <div className="min-w-0">
                    <p className="font-semibold text-on-surface">{category.name}</p>
                    {category.description ? (
                      <p className="line-clamp-1 text-sm text-on-surface-variant">{category.description}</p>
                    ) : null}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-center text-on-surface-variant">{category.sortOrder}</td>
              <td className="px-4 py-3 text-center">
                {childCount > 0 ? (
                  <span className="inline-flex rounded-full bg-surface-container px-2.5 py-0.5 text-xs font-semibold text-secondary">
                    {childCount} alt
                  </span>
                ) : (
                  <span className="text-xs text-outline">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-center">
                <CategoryStatusPill isActive={category.isActive} />
              </td>
              <td className="px-4 py-3 text-center">
                {canEdit ? (
                  <button
                    type="button"
                    className="inline-flex rounded-full p-1.5 text-on-surface-variant transition hover:bg-surface-container hover:text-secondary"
                    onClick={(e: MouseEvent) => {
                      e.stopPropagation();
                      onEdit(category);
                    }}
                    aria-label={`${category.name} düzenle`}
                  >
                    <span className="material-symbols-outlined text-[22px]">edit</span>
                  </button>
                ) : null}
              </td>
            </tr>
            {hasChildren && expanded ? (
              <TreeRows
                nodes={category.children!}
                depth={depth + 1}
                selectedId={selectedId}
                expandedIds={expandedIds}
                onToggleExpand={onToggleExpand}
                onSelect={onSelect}
                onEdit={onEdit}
                canEdit={canEdit}
              />
            ) : null}
          </Fragment>
        );
      })}
    </>
  );
}

function flattenForGrid(nodes: CategoryNode[]): CategoryNode[] {
  return nodes.flatMap((n) => [n, ...flattenForGrid(n.children ?? [])]);
}

export function CategoriesList({
  tree,
  viewMode,
  selectedId,
  onSelect,
  onEdit,
  canEdit,
}: Readonly<{
  tree: CategoryNode[];
  viewMode: CategoryViewMode;
  selectedId: string | null;
  onSelect: (c: CategoryNode) => void;
  onEdit: (c: CategoryNode) => void;
  canEdit: boolean;
}>): JSX.Element {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  function toggleExpand(id: string): void {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function expandAll(): void {
    const ids = new Set<string>();
    const walk = (nodes: CategoryNode[]): void => {
      for (const n of nodes) {
        if (n.children?.length) {
          ids.add(n.id);
          walk(n.children);
        }
      }
    };
    walk(tree);
    setExpandedIds(ids);
  }

  if (tree.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-outline-variant bg-surface-container-low px-8 py-16 text-center">
        <span className="material-symbols-outlined text-[48px] text-outline">folder_off</span>
        <p className="mt-4 font-display text-lg font-semibold text-on-surface">Kategori bulunamadı</p>
        <p className="mt-2 text-sm text-on-surface-variant">Filtreleri değiştirin veya yeni kategori ekleyin.</p>
      </div>
    );
  }

  if (viewMode === 'grid') {
    const flat = flattenForGrid(tree);
    return (
      <div className="grid gap-gutter sm:grid-cols-2 xl:grid-cols-3">
        {flat.map((category) => {
          const selected = selectedId === category.id;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onSelect(category)}
              className={`flex flex-col rounded-card border p-5 text-left shadow-bakery transition hover:shadow-[0_8px_16px_rgba(61,43,31,0.08)] ${
                selected ? 'border-secondary/40 bg-secondary-container/20' : 'border-outline-variant/35 bg-surface-container-lowest'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <CategoryThumb category={category} />
                <CategoryStatusPill isActive={category.isActive} />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold text-on-surface">{category.name}</h3>
              {category.description ? <p className="mt-2 line-clamp-2 text-sm text-on-surface-variant">{category.description}</p> : null}
              <div className="mt-4 flex items-center justify-between text-xs text-on-surface-variant">
                <span>Sıra: {category.sortOrder}</span>
                {(category.children?.length ?? 0) > 0 ? <span>{category.children!.length} alt kategori</span> : null}
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-card border border-outline-variant/35 bg-surface-container-lowest shadow-bakery">
      <div className="flex justify-end border-b border-outline-variant/25 px-4 py-2">
        <button type="button" className="text-xs font-semibold text-secondary hover:underline" onClick={expandAll}>
          Tümünü genişlet
        </button>
      </div>
      <div className="-mx-gutter overflow-x-auto px-gutter">
        <table className="w-full min-w-[680px] border-collapse">
          <thead>
            <tr className="border-b border-outline-variant/35">
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Kategori</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Sıra</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Alt</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Durum</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-on-surface-variant">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/15 text-[15px]">
            <TreeRows
              nodes={tree}
              depth={0}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onToggleExpand={toggleExpand}
              onSelect={onSelect}
              onEdit={onEdit}
              canEdit={canEdit}
            />
          </tbody>
        </table>
      </div>
    </div>
  );
}
