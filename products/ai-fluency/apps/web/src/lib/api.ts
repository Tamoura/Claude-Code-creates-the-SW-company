// API client for AI Fluency
// Uses in-memory token storage with Authorization header injection

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5014';
const API_PREFIX = `${API_BASE}/api/v1`;

let accessToken: string | null = null;
let refreshToken: string | null = null;

export function setTokens(access: string, refresh: string): void {
  accessToken = access;
  refreshToken = refresh;
}

export function clearTokens(): void {
  accessToken = null;
  refreshToken = null;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function getRefreshToken(): string | null {
  return refreshToken;
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

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  let response = await fetch(url, {
    ...options,
    method,
    headers,
  });

  // If 401 and we have a refresh token, try to refresh
  if (response.status === 401 && refreshToken && !endpoint.includes('/auth/refresh')) {
    const refreshed = await attemptRefresh();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${accessToken}`;
      response = await fetch(url, { ...options, method, headers });
    }
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

async function attemptRefresh(): Promise<boolean> {
  try {
    const response = await fetch(`${API_PREFIX}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      clearTokens();
      return false;
    }

    const data = await response.json() as { accessToken: string };
    accessToken = data.accessToken;
    return true;
  } catch {
    clearTokens();
    return false;
  }
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
