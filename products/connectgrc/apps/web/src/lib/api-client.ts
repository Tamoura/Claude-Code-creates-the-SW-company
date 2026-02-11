/**
 * API Client for ConnectGRC
 *
 * Base HTTP client for communicating with the Fastify backend.
 * Adapted from stablecoin-gateway api-client (base methods only,
 * no product-specific methods or mock mode).
 */

import { TokenManager } from './token-manager';

const API_BASE_URL =
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5006')
    : 'http://localhost:5006';

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface User {
  id: string;
  email: string;
  role: 'talent' | 'employer' | 'admin';
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface RegisterResponse {
  message: string;
}

export class ApiClientError extends Error {
  status: number;
  code: string;
  detail: string;

  constructor(status: number, code: string, detail: string) {
    super(detail);
    this.status = status;
    this.code = code;
    this.detail = detail;
    this.name = 'ApiClientError';
  }
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (options.body) {
      headers['Content-Type'] = 'application/json';
    }

    const token = TokenManager.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, { ...options, headers });

      if (!response.ok) {
        if (response.status === 401) {
          TokenManager.clearToken();
        }

        let errorBody: ApiError;
        try {
          errorBody = await response.json();
        } catch {
          throw new ApiClientError(
            response.status,
            'UNKNOWN_ERROR',
            `Request failed with status ${response.status}`
          );
        }

        throw new ApiClientError(
          response.status,
          errorBody.error?.code || 'UNKNOWN_ERROR',
          errorBody.error?.message || 'An unknown error occurred'
        );
      }

      if (response.status === 204 || response.headers.get('content-length') === '0') {
        return undefined as T;
      }

      return response.json();
    } catch (error) {
      if (error instanceof ApiClientError) {
        throw error;
      }
      throw new ApiClientError(500, 'NETWORK_ERROR', 'Failed to connect to API');
    }
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    TokenManager.setToken(response.accessToken);
    return response;
  }

  async register(
    email: string,
    password: string,
    role: 'talent' | 'employer' = 'talent'
  ): Promise<RegisterResponse> {
    return this.request<RegisterResponse>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, role }),
    });
  }

  async logout(): Promise<void> {
    try {
      await this.request('/api/v1/auth/logout', { method: 'DELETE' });
    } finally {
      TokenManager.clearToken();
    }
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const response = await this.request<{ accessToken: string; refreshToken: string }>(
      '/api/v1/auth/refresh',
      {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }
    );

    TokenManager.setToken(response.accessToken);
    return response;
  }

  async getProfile(): Promise<User> {
    return this.request<User>('/api/v1/profile');
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint);
  }

  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
