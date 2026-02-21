export interface PaginationParams {
  page: number;
  limit: number;
}

export interface OffsetPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CursorPaginationMeta {
  cursor: string | null;
  hasMore: boolean;
  count: number;
}

export function parsePagination(
  query: { page?: string; limit?: string }
): PaginationParams {
  const page = Math.max(1, parseInt(query.page || '1', 10) || 1);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(query.limit || '20', 10) || 20)
  );
  return { page, limit };
}

export function offsetMeta(
  total: number,
  params: PaginationParams
): OffsetPaginationMeta {
  return {
    page: params.page,
    limit: params.limit,
    total,
    totalPages: Math.ceil(total / params.limit),
  };
}

export function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(
    JSON.stringify({ createdAt: createdAt.toISOString(), id })
  ).toString('base64');
}

export function decodeCursor(
  cursor: string
): { createdAt: Date; id: string } | null {
  try {
    const decoded = JSON.parse(
      Buffer.from(cursor, 'base64').toString('utf-8')
    );
    return {
      createdAt: new Date(decoded.createdAt),
      id: decoded.id,
    };
  } catch {
    return null;
  }
}
