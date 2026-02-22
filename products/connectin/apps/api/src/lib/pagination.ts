import { BadRequestError } from './errors';

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

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function decodeCursor(
  cursor: string
): { createdAt: Date; id: string } | null {
  if (!cursor) return null;

  let decoded: { createdAt?: string; id?: string };
  try {
    decoded = JSON.parse(
      Buffer.from(cursor, 'base64').toString('utf-8')
    );
  } catch {
    throw new BadRequestError('Invalid cursor format');
  }

  const date = new Date(decoded.createdAt ?? '');
  if (isNaN(date.getTime())) {
    throw new BadRequestError('Invalid cursor: bad date');
  }

  if (!decoded.id || !UUID_REGEX.test(decoded.id)) {
    throw new BadRequestError('Invalid cursor: bad id');
  }

  return { createdAt: date, id: decoded.id };
}
