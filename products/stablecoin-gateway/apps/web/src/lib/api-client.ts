/**
 * API Client for Stablecoin Gateway
 *
 * This client interfaces with the backend API.
 * For development/testing, it can use mock responses when API is unavailable.
 */

import { TokenManager } from './token-manager';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true';

export interface PaymentSession {
  id: string;
  amount: number;
  currency: 'USD';
  description?: string;
  status: 'pending' | 'confirming' | 'completed' | 'failed' | 'refunded';
  network: 'polygon' | 'ethereum';
  token: 'USDC' | 'USDT';
  merchant_address: string;
  customer_address?: string;
  tx_hash?: string;
  block_number?: number;
  confirmations?: number;
  checkout_url: string;
  success_url?: string;
  cancel_url?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  expires_at: string;
  completed_at?: string;
}

export interface CreatePaymentSessionRequest {
  amount: number;
  currency?: 'USD';
  description?: string;
  network?: 'polygon' | 'ethereum';
  token?: 'USDC' | 'USDT';
  merchant_address: string;
  success_url?: string;
  cancel_url?: string;
  metadata?: Record<string, unknown>;
}

export interface ApiError {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  request_id?: string;
}

export interface LoginResponse {
  id: string;
  email: string;
  access_token: string;
  refresh_token: string;
}

export interface User {
  id: string;
  email: string;
}

export class ApiClient {
  private baseUrl: string;
  private useMock: boolean;

  constructor(baseUrl: string, useMock: boolean) {
    this.baseUrl = baseUrl;
    this.useMock = useMock;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // If mock mode, use localStorage-based mock
    if (this.useMock) {
      return this.mockRequest<T>(endpoint, options);
    }

    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    // Inject Authorization header if token exists
    const token = TokenManager.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, { ...options, headers });

      if (!response.ok) {
        // Handle 401 Unauthorized - clear token and throw error
        if (response.status === 401) {
          TokenManager.clearToken();
        }

        const error: ApiError = await response.json();
        throw new ApiClientError(
          error.status,
          error.title,
          error.detail,
          error
        );
      }

      return response.json();
    } catch (error) {
      if (error instanceof ApiClientError) {
        throw error;
      }
      throw new ApiClientError(500, 'Network Error', 'Failed to connect to API');
    }
  }

  private async mockRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Mock implementation using localStorage (for testing until backend is ready)
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate network delay

    if (endpoint.startsWith('/v1/payment-sessions') && options.method === 'POST') {
      const body = JSON.parse(options.body as string) as CreatePaymentSessionRequest;
      const id = 'ps_' + crypto.randomUUID().substring(0, 8);

      const session: PaymentSession = {
        id,
        amount: body.amount,
        currency: body.currency || 'USD',
        description: body.description,
        status: 'pending',
        network: body.network || 'polygon',
        token: body.token || 'USDC',
        merchant_address: body.merchant_address,
        checkout_url: `${window.location.origin}/pay/${id}`,
        success_url: body.success_url,
        cancel_url: body.cancel_url,
        metadata: body.metadata,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      // Store in localStorage
      localStorage.setItem(`payment_${id}`, JSON.stringify(session));

      return session as T;
    }

    if (endpoint.match(/\/v1\/payment-sessions\/ps_[a-zA-Z0-9]+$/)) {
      const id = endpoint.split('/').pop();
      const stored = localStorage.getItem(`payment_${id}`);

      if (!stored) {
        throw new ApiClientError(404, 'Not Found', 'Payment session not found');
      }

      return JSON.parse(stored) as T;
    }

    throw new ApiClientError(501, 'Not Implemented', 'Mock endpoint not implemented');
  }

  async createPaymentSession(
    data: CreatePaymentSessionRequest
  ): Promise<PaymentSession> {
    return this.request<PaymentSession>('/v1/payment-sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getPaymentSession(id: string): Promise<PaymentSession> {
    return this.request<PaymentSession>(`/v1/payment-sessions/${id}`);
  }

  async updatePaymentSession(
    id: string,
    data: Partial<PaymentSession>
  ): Promise<PaymentSession> {
    // For mock mode, update localStorage
    if (this.useMock) {
      const stored = localStorage.getItem(`payment_${id}`);
      if (!stored) {
        throw new ApiClientError(404, 'Not Found', 'Payment session not found');
      }

      const session = JSON.parse(stored) as PaymentSession;
      const updated = { ...session, ...data };
      localStorage.setItem(`payment_${id}`, JSON.stringify(updated));

      return updated;
    }

    return this.request<PaymentSession>(`/v1/payment-sessions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async listPaymentSessions(params?: {
    limit?: number;
    offset?: number;
    status?: string;
  }): Promise<{ data: PaymentSession[]; pagination: { total: number; has_more: boolean } }> {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return this.request<{ data: PaymentSession[]; pagination: { total: number; has_more: boolean } }>(
      `/v1/payment-sessions${query ? `?${query}` : ''}`
    );
  }

  // Request a short-lived SSE token for a specific payment session
  async requestSseToken(paymentId: string): Promise<{ token: string; expires_at: string }> {
    return this.request<{ token: string; expires_at: string }>('/v1/auth/sse-token', {
      method: 'POST',
      body: JSON.stringify({ payment_session_id: paymentId }),
    });
  }

  // SSE connection for real-time updates
  async createEventSource(paymentId: string): Promise<EventSource> {
    if (this.useMock) {
      // Mock SSE not implemented - would need a more complex mock
      throw new Error('SSE not available in mock mode');
    }

    // Request a short-lived SSE token specific to this payment session
    const { token } = await this.requestSseToken(paymentId);

    // EventSource API cannot set custom headers, so we pass the token as a query parameter
    // Using short-lived SSE tokens (15 min) instead of long-lived access tokens improves security
    const url = `${this.baseUrl}/v1/payment-sessions/${paymentId}/events?token=${encodeURIComponent(token)}`;
    return new EventSource(url);
  }

  // Authentication methods

  /**
   * Login with email and password
   * Stores access token in TokenManager
   * @returns User object with ID, email, and access token
   */
  async login(email: string, password: string): Promise<User & { accessToken: string; refreshToken: string }> {
    const response = await this.request<LoginResponse>('/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    // Store access token
    TokenManager.setToken(response.access_token);

    return {
      id: response.id,
      email: response.email,
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
    };
  }

  /**
   * Logout current user
   * Clears token and revokes refresh token on backend
   * @param refreshToken The refresh token to revoke
   */
  async logout(refreshToken?: string): Promise<void> {
    try {
      if (refreshToken) {
        // Call logout endpoint to revoke refresh token
        await this.request('/v1/auth/logout', {
          method: 'DELETE',
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
      }
    } finally {
      // Always clear token, even if request fails
      TokenManager.clearToken();
    }
  }
}

export class ApiClientError extends Error {
  status: number;
  title: string;
  detail: string;
  rawError?: ApiError;

  constructor(
    status: number,
    title: string,
    detail: string,
    rawError?: ApiError
  ) {
    super(detail);
    this.status = status;
    this.title = title;
    this.detail = detail;
    this.rawError = rawError;
    this.name = 'ApiClientError';
  }
}

export const apiClient = new ApiClient(API_BASE_URL, USE_MOCK_API);
