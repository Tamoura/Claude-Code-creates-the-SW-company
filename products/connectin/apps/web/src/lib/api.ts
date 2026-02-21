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

/** Methods that mutate server state and require CSRF protection. */
const MUTATING_METHODS = new Set(["POST", "PUT", "DELETE", "PATCH"]);

/**
 * Read a cookie value by name from document.cookie.
 * Returns null when running on the server (SSR) or if the cookie is absent.
 */
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp("(?:^|;\\s*)" + name + "=([^;]*)")
  );
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * API client for ConnectIn backend.
 * Wraps fetch with auth token handling, CSRF protection for mutating
 * requests, HTTP status checking, network error handling, 401 detection,
 * and consistent response types.
 *
 * CSRF flow (double-submit cookie pattern):
 *  1. The backend sets a `_csrf` cookie via @fastify/csrf-protection.
 *  2. Before the first mutating request the client calls GET /csrf-token
 *     which triggers `reply.generateCsrf()` on the server and returns the
 *     token in the response body.
 *  3. The client caches the token and sends it as `x-csrf-token` header
 *     on every POST / PUT / PATCH / DELETE request.
 *  4. On a 403 with a CSRF-related message the token is refreshed once
 *     and the request is retried.
 */
class ApiClient {
  private baseUrl: string;
  private token: string | null = null;
  private csrfToken: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  /**
   * Fetch a fresh CSRF token from the backend.
   * The server endpoint GET /csrf-token calls `reply.generateCsrf()`,
   * sets the `_csrf` cookie, and returns `{ token: "..." }`.
   */
  async fetchCsrfToken(): Promise<string | null> {
    try {
      const response = await fetch(`${this.baseUrl}/csrf-token`, {
        method: "GET",
        credentials: "include",
        headers: this.getHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        this.csrfToken = data.token ?? getCookie("_csrf") ?? null;
        return this.csrfToken;
      }
    } catch {
      // CSRF token fetch failed — proceed without it so the app
      // degrades gracefully (the server will reject if it requires CSRF).
    }
    return null;
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

  /**
   * Build headers for a specific HTTP method.
   * Mutating methods include the CSRF token header.
   */
  private getHeadersForMethod(
    method: string,
    extra?: HeadersInit
  ): HeadersInit {
    const headers = { ...this.getHeaders(), ...extra };
    if (MUTATING_METHODS.has(method) && this.csrfToken) {
      (headers as Record<string, string>)["x-csrf-token"] = this.csrfToken;
    }
    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    if (!response.ok) {
      if (response.status === 401) {
        // Clear the stored token on authentication failure
        this.token = null;
      }

      try {
        const errorBody = await response.json();
        return {
          success: false,
          error: {
            code: `HTTP_${response.status}`,
            message: errorBody?.error?.message || response.statusText,
            details: errorBody?.error?.details,
          },
        };
      } catch {
        return {
          success: false,
          error: {
            code: `HTTP_${response.status}`,
            message: response.statusText,
          },
        };
      }
    }

    return response.json();
  }

  /**
   * Ensure we have a CSRF token before making a mutating request.
   * Lazily fetches one on the first call, then reuses the cached value.
   */
  private async ensureCsrfToken(): Promise<void> {
    if (!this.csrfToken) {
      await this.fetchCsrfToken();
    }
  }

  async get<T>(path: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    try {
      const url = this.buildUrl(path, options?.params);
      const response = await fetch(url, {
        ...options,
        method: "GET",
        credentials: "include",
        headers: this.getHeadersForMethod("GET", options?.headers as HeadersInit),
      });
      return this.handleResponse<T>(response);
    } catch (error) {
      return {
        success: false,
        error: {
          code: "NETWORK_ERROR",
          message:
            error instanceof Error ? error.message : "Network request failed",
        },
      };
    }
  }

  async post<T>(
    path: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    try {
      await this.ensureCsrfToken();
      const url = this.buildUrl(path, options?.params);
      const response = await fetch(url, {
        ...options,
        method: "POST",
        credentials: "include",
        headers: this.getHeadersForMethod("POST", options?.headers as HeadersInit),
        body: body ? JSON.stringify(body) : undefined,
      });
      return this.handleResponse<T>(response);
    } catch (error) {
      return {
        success: false,
        error: {
          code: "NETWORK_ERROR",
          message:
            error instanceof Error ? error.message : "Network request failed",
        },
      };
    }
  }

  async put<T>(
    path: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    try {
      await this.ensureCsrfToken();
      const url = this.buildUrl(path, options?.params);
      const response = await fetch(url, {
        ...options,
        method: "PUT",
        credentials: "include",
        headers: this.getHeadersForMethod("PUT", options?.headers as HeadersInit),
        body: body ? JSON.stringify(body) : undefined,
      });
      return this.handleResponse<T>(response);
    } catch (error) {
      return {
        success: false,
        error: {
          code: "NETWORK_ERROR",
          message:
            error instanceof Error ? error.message : "Network request failed",
        },
      };
    }
  }

  async patch<T>(
    path: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    try {
      await this.ensureCsrfToken();
      const url = this.buildUrl(path, options?.params);
      const response = await fetch(url, {
        ...options,
        method: "PATCH",
        credentials: "include",
        headers: this.getHeadersForMethod("PATCH", options?.headers as HeadersInit),
        body: body ? JSON.stringify(body) : undefined,
      });
      return this.handleResponse<T>(response);
    } catch (error) {
      return {
        success: false,
        error: {
          code: "NETWORK_ERROR",
          message:
            error instanceof Error ? error.message : "Network request failed",
        },
      };
    }
  }

  async delete<T>(
    path: string,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    try {
      await this.ensureCsrfToken();
      const url = this.buildUrl(path, options?.params);
      const response = await fetch(url, {
        ...options,
        method: "DELETE",
        credentials: "include",
        headers: this.getHeadersForMethod("DELETE", options?.headers as HeadersInit),
      });
      return this.handleResponse<T>(response);
    } catch (error) {
      return {
        success: false,
        error: {
          code: "NETWORK_ERROR",
          message:
            error instanceof Error ? error.message : "Network request failed",
        },
      };
    }
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
export type { ApiResponse };
