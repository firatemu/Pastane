import type { Category } from './types';

export type CategoryNode = Category & { children?: CategoryNode[] };

export function flattenCategories(rows: CategoryNode[]): CategoryNode[] {
  return rows.flatMap((row) => [row, ...flattenCategories(row.children ?? [])]);
}

export function countCategoryStats(flat: CategoryNode[]): {
  total: number;
  active: number;
  inactive: number;
  roots: number;
  withChildren: number;
} {
  const roots = flat.filter((c) => !c.parentId).length;
  const withChildren = flat.filter((c) => (c.children?.length ?? 0) > 0).length;
  return {
    total: flat.length,
    active: flat.filter((c) => c.isActive).length,
    inactive: flat.filter((c) => !c.isActive).length,
    roots,
    withChildren,
  };
}

/** Exclude category and its descendants from parent picker options. */
export function blockedParentIds(tree: CategoryNode[], editingId: string | null): Set<string> {
  if (!editingId) return new Set();
  const blocked = new Set<string>();

  function findAndBlock(nodes: CategoryNode[]): boolean {
    for (const node of nodes) {
      if (node.id === editingId) {
        const blockSubtree = (n: CategoryNode): void => {
          blocked.add(n.id);
          n.children?.forEach(blockSubtree);
        };
        blockSubtree(node);
        return true;
      }
      if (node.children?.length && findAndBlock(node.children)) return true;
    }
    return false;
  }

  findAndBlock(tree);
  return blocked;
}

export function filterCategoryTree(
  nodes: CategoryNode[],
  predicate: (c: CategoryNode) => boolean,
): CategoryNode[] {
  const out: CategoryNode[] = [];
  for (const node of nodes) {
    const children = filterCategoryTree(node.children ?? [], predicate);
    if (predicate(node) || children.length > 0) {
      out.push({ ...node, children });
    }
  }
  return out;
}

export function parentName(flat: CategoryNode[], parentId: string | null): string | null {
  if (!parentId) return null;
  return flat.find((c) => c.id === parentId)?.name ?? null;
}
