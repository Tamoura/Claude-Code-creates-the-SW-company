/**
 * API Client for Pulse
 *
 * HTTP client for communicating with the Pulse backend API.
 * Adapted from ConnectSW Component Registry (stablecoin-gateway).
 */

import { TokenManager } from './token-manager';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5003';

export interface ApiError {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  request_id?: string;
}

export class ApiClientError extends Error {
  status: number;
  title: string;
  detail: string;

  constructor(status: number, title: string, detail: string) {
    super(detail);
    this.name = 'ApiClientError';
    this.status = status;
    this.title = title;
    this.detail = detail;
  }
}

interface LoginResponse {
  id: string;
  email: string;
  name?: string;
  role: string;
  token: string;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = TokenManager.getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (response.status === 401) {
    TokenManager.clearToken();
  }

  if (!response.ok) {
    let errorData: ApiError;
    try {
      errorData = await response.json();
    } catch {
      throw new ApiClientError(
        response.status,
        'Request Failed',
        `HTTP ${response.status}: ${response.statusText}`
      );
    }
    throw new ApiClientError(
      response.status,
      errorData.title || 'Error',
      errorData.detail || 'An unknown error occurred'
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export const apiClient = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const result = await request<LoginResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    TokenManager.setToken(result.token);
    return result;
  },

  async signup(
    name: string,
    email: string,
    password: string
  ): Promise<LoginResponse> {
    const result = await request<LoginResponse>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    TokenManager.setToken(result.token);
    return result;
  },

  async logout(): Promise<void> {
    try {
      await request<void>('/api/v1/auth/logout', { method: 'POST' });
    } finally {
      TokenManager.clearToken();
    }
  },

  async forgotPassword(email: string): Promise<void> {
    await request<void>('/api/v1/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(token: string, password: string): Promise<void> {
    await request<void>('/api/v1/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  },

  get<T>(path: string): Promise<T> {
    return request<T>(path);
  },

  post<T>(path: string, body: unknown): Promise<T> {
    return request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  put<T>(path: string, body: unknown): Promise<T> {
    return request<T>(path, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  delete<T>(path: string): Promise<T> {
    return request<T>(path, { method: 'DELETE' });
  },
};
