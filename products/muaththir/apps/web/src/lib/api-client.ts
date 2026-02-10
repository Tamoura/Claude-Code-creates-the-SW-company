/**
 * API Client for Mu'aththir backend
 *
 * Communicates with the Fastify API at http://localhost:5005.
 * Uses the TokenManager for XSS-safe JWT storage.
 */

import { TokenManager } from './token-manager';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005';

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export interface SignupPayload {
  name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
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

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: 'Request failed',
      }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async signup(payload: SignupPayload): Promise<LoginResponse> {
    const result = await this.request<LoginResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    TokenManager.setToken(result.accessToken);
    return result;
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    const result = await this.request<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    TokenManager.setToken(result.accessToken);
    return result;
  }

  async logout(): Promise<void> {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } finally {
      TokenManager.clearToken();
    }
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    return this.request('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(
    token: string,
    password: string
  ): Promise<{ message: string }> {
    return this.request('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  }

  async getMe(): Promise<User> {
    return this.request('/api/users/me');
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
