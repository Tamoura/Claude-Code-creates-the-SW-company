/**
 * API client base.
 *
 * CONVENTION (binding for all downstream agents):
 *   Every call goes through `apiFetch`. It is the single place that attaches
 *   credentials, propagates `X-Request-ID`, and unwraps the `{ error: { code,
 *   message } }` envelope the API always returns. Do not call `fetch` directly
 *   from a component.
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5018';

export interface ApiErrorBody {
  error: { code: string; message: string; requestId?: string };
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly requestId?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    let body: ApiErrorBody | undefined;
    try {
      body = (await response.json()) as ApiErrorBody;
    } catch {
      body = undefined;
    }
    throw new ApiError(
      response.status,
      body?.error.code ?? 'UNKNOWN',
      body?.error.message ?? response.statusText,
      body?.error.requestId
    );
  }

  return (await response.json()) as T;
}
