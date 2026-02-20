const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5007/api/v1";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
  meta?: {
    page: number;
    limit: number;
    total: number;
  };
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

/**
 * API client for ConnectIn backend.
 * Wraps fetch with auth token handling, error parsing,
 * and consistent response types.
 */
class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  private buildUrl(path: string, params?: Record<string, string>): string {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }
    return url.toString();
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }
    return headers;
  }

  async get<T>(path: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    const url = this.buildUrl(path, options?.params);
    const response = await fetch(url, {
      ...options,
      method: "GET",
      headers: { ...this.getHeaders(), ...options?.headers },
    });
    return response.json();
  }

  async post<T>(
    path: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    const url = this.buildUrl(path, options?.params);
    const response = await fetch(url, {
      ...options,
      method: "POST",
      headers: { ...this.getHeaders(), ...options?.headers },
      body: body ? JSON.stringify(body) : undefined,
    });
    return response.json();
  }

  async patch<T>(
    path: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    const url = this.buildUrl(path, options?.params);
    const response = await fetch(url, {
      ...options,
      method: "PATCH",
      headers: { ...this.getHeaders(), ...options?.headers },
      body: body ? JSON.stringify(body) : undefined,
    });
    return response.json();
  }

  async delete<T>(
    path: string,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    const url = this.buildUrl(path, options?.params);
    const response = await fetch(url, {
      ...options,
      method: "DELETE",
      headers: { ...this.getHeaders(), ...options?.headers },
    });
    return response.json();
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
export type { ApiResponse };
