export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;
export function normalizePagination(page?: number, limit?: number) {
  return { page: Math.max(page ?? DEFAULT_PAGE, 1), limit: Math.min(Math.max(limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT) };
}
export interface PaginatedResult<T> { items: T[]; meta: { page: number; limit: number; total: number; totalPages: number } }
