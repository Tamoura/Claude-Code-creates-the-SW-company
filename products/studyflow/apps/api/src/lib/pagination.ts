/**
 * Pagination helper (architecture.md §12). List endpoints accept `page`/`limit`
 * (limit ≤ 100) and return the standard envelope `{ data, pagination }`.
 */
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface Paginated<T> {
  data: T[];
  pagination: PaginationMeta;
}

export function toSkipTake(params: PaginationParams): {
  skip: number;
  take: number;
} {
  return { skip: (params.page - 1) * params.limit, take: params.limit };
}

export function buildPagination(
  params: PaginationParams,
  total: number
): PaginationMeta {
  const totalPages = total === 0 ? 0 : Math.ceil(total / params.limit);
  return {
    page: params.page,
    limit: params.limit,
    total,
    totalPages,
    hasMore: params.page < totalPages,
  };
}

export function paginate<T>(
  data: T[],
  params: PaginationParams,
  total: number
): Paginated<T> {
  return { data, pagination: buildPagination(params, total) };
}
