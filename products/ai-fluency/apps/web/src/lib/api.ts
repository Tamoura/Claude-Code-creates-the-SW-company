// API client for AI Fluency
// - Always uses credentials: "include" for httpOnly cookie auth
// - Fetches CSRF token from GET /api/v1/csrf-token on first mutation
// - Sends x-csrf-token header on all state-changing requests

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5014';
const API_PREFIX = `${API_BASE}/api/v1`;

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

let csrfToken: string | null = null;

async function fetchCsrfToken(): Promise<string> {
  const res = await fetch(`${API_PREFIX}/csrf-token`, {
    method: 'GET',
    credentials: 'include',
  });
  if (!res.ok) {
    throw new ApiError(res.status, 'csrf-error', 'Failed to fetch CSRF token');
  }
  const data = await res.json() as { csrfToken: string };
  return data.csrfToken;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  const url = `${API_PREFIX}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  // Attach CSRF token for all mutating requests
  if (MUTATION_METHODS.has(method)) {
    if (!csrfToken) {
      csrfToken = await fetchCsrfToken();
    }
    headers['x-csrf-token'] = csrfToken;
  }

  const response = await fetch(url, {
    ...options,
    method,
    headers,
    credentials: 'include',
  });

  // If CSRF token is rejected, refresh and retry once
  if (response.status === 403 && MUTATION_METHODS.has(method)) {
    csrfToken = await fetchCsrfToken();
    headers['x-csrf-token'] = csrfToken;
    const retryResponse = await fetch(url, {
      ...options,
      method,
      headers,
      credentials: 'include',
    });
    if (!retryResponse.ok) {
      const errorBody = await retryResponse.json().catch(() => ({})) as {
        code?: string;
        detail?: string;
      };
      throw new ApiError(
        retryResponse.status,
        errorBody.code ?? 'api-error',
        errorBody.detail ?? 'An error occurred',
      );
    }
    if (retryResponse.status === 204) return undefined as T;
    return retryResponse.json() as Promise<T>;
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({})) as {
      code?: string;
      detail?: string;
    };
    throw new ApiError(
      response.status,
      errorBody.code ?? 'api-error',
      errorBody.detail ?? 'An error occurred',
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  get<T>(endpoint: string, options?: RequestInit) {
    return request<T>(endpoint, { ...options, method: 'GET' });
  },
  post<T>(endpoint: string, data?: unknown, options?: RequestInit) {
    return request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data ?? {}),
    });
  },
  put<T>(endpoint: string, data?: unknown, options?: RequestInit) {
    return request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data ?? {}),
    });
  },
  patch<T>(endpoint: string, data?: unknown, options?: RequestInit) {
    return request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data ?? {}),
    });
  },
  delete<T>(endpoint: string, options?: RequestInit) {
    return request<T>(endpoint, { ...options, method: 'DELETE' });
  },
};
