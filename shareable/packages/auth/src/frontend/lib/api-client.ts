import { TokenManager } from './token-manager.js';

export interface User {
  id: string;
  email: string;
  role: string;
}

export interface LoginResponse extends User {
  access_token: string;
  refresh_token: string;
}

export interface AuthApiClientOptions {
  baseUrl: string;
  /** Auth routes prefix. Default: '/v1/auth' */
  authPrefix?: string;
}

export function createAuthApiClient(options: AuthApiClientOptions) {
  const { baseUrl, authPrefix = '/v1/auth' } = options;

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(init?.headers as Record<string, string>),
    };

    const token = TokenManager.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || `Request failed: ${response.status}`);
    }

    if (response.status === 204) return undefined as T;
    return response.json();
  }

  return {
    async login(email: string, password: string): Promise<LoginResponse> {
      const result = await request<LoginResponse>(`${authPrefix}/login`, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      TokenManager.setToken(result.access_token);
      return result;
    },

    async signup(email: string, password: string): Promise<LoginResponse> {
      const result = await request<LoginResponse>(`${authPrefix}/signup`, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (result.access_token) {
        TokenManager.setToken(result.access_token);
      }
      return result;
    },

    async logout(): Promise<void> {
      const refreshToken = TokenManager.getToken();
      try {
        await request(`${authPrefix}/logout`, {
          method: 'DELETE',
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
      } finally {
        TokenManager.clearToken();
      }
    },

    async refresh(refreshToken: string): Promise<{ access_token: string; refresh_token: string }> {
      const result = await request<{ access_token: string; refresh_token: string }>(
        `${authPrefix}/refresh`,
        {
          method: 'POST',
          body: JSON.stringify({ refresh_token: refreshToken }),
        }
      );
      TokenManager.setToken(result.access_token);
      return result;
    },

    async changePassword(currentPassword: string, newPassword: string): Promise<void> {
      await request(`${authPrefix}/change-password`, {
        method: 'POST',
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
    },

    async forgotPassword(email: string): Promise<void> {
      await request(`${authPrefix}/forgot-password`, {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
    },

    async resetPassword(token: string, newPassword: string): Promise<void> {
      await request(`${authPrefix}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ token, newPassword }),
      });
    },

    async getSessions(): Promise<{ data: Array<{ id: string; created_at: string; expires_at: string }> }> {
      return request(`${authPrefix}/sessions`);
    },

    async revokeSession(sessionId: string): Promise<void> {
      await request(`${authPrefix}/sessions/${sessionId}`, { method: 'DELETE' });
    },

    /** Generic authenticated request helper for product-specific endpoints */
    request,
  };
}
