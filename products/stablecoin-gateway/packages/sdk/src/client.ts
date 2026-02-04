import { ApiError } from './errors';
import type {
  PaymentSession,
  CreatePaymentSessionParams,
  ListPaymentSessionsParams,
  PaginatedResponse,
  Refund,
  CreateRefundParams,
  ListRefundsParams,
  StablecoinGatewayOptions,
} from './types';

const DEFAULT_BASE_URL = 'https://api.stableflow.io';
const SDK_VERSION = '1.0.0';

export class StablecoinGateway {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(apiKey: string, options?: StablecoinGatewayOptions) {
    if (!apiKey || typeof apiKey !== 'string') {
      throw new Error('API key is required');
    }
    this.apiKey = apiKey;
    this.baseUrl = (options?.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
  }

  // ==================== Payment Sessions ====================

  async createPaymentSession(params: CreatePaymentSessionParams): Promise<PaymentSession> {
    const { idempotency_key, ...body } = params;
    const headers: Record<string, string> = {};
    if (idempotency_key) {
      headers['Idempotency-Key'] = idempotency_key;
    }
    return this.request<PaymentSession>('POST', '/v1/payment-sessions', body, headers);
  }

  async getPaymentSession(id: string): Promise<PaymentSession> {
    return this.request<PaymentSession>('GET', `/v1/payment-sessions/${encodeURIComponent(id)}`);
  }

  async listPaymentSessions(
    params?: ListPaymentSessionsParams,
  ): Promise<PaginatedResponse<PaymentSession>> {
    const query = params ? this.buildQuery(params as Record<string, unknown>) : '';
    return this.request<PaginatedResponse<PaymentSession>>(
      'GET',
      `/v1/payment-sessions${query}`,
    );
  }

  // ==================== Refunds ====================

  async createRefund(params: CreateRefundParams): Promise<Refund> {
    const { idempotency_key, ...body } = params;
    const headers: Record<string, string> = {};
    if (idempotency_key) {
      headers['Idempotency-Key'] = idempotency_key;
    }
    return this.request<Refund>('POST', '/v1/refunds', body, headers);
  }

  async getRefund(id: string): Promise<Refund> {
    return this.request<Refund>('GET', `/v1/refunds/${encodeURIComponent(id)}`);
  }

  async listRefunds(params?: ListRefundsParams): Promise<PaginatedResponse<Refund>> {
    const query = params ? this.buildQuery(params as Record<string, unknown>) : '';
    return this.request<PaginatedResponse<Refund>>('GET', `/v1/refunds${query}`);
  }

  // ==================== Internal ====================

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    extraHeaders?: Record<string, string>,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': `stablecoin-gateway-sdk/${SDK_VERSION}`,
      ...extraHeaders,
    };

    const init: RequestInit = { method, headers };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }

    const response = await fetch(url, init);
    const responseBody = await response.text();

    if (!response.ok) {
      let parsed: { error?: { code?: string; message?: string; details?: unknown } } = {};
      try {
        parsed = JSON.parse(responseBody);
      } catch {
        // non-JSON error response
      }
      throw new ApiError(
        response.status,
        parsed.error?.code ?? 'UNKNOWN_ERROR',
        parsed.error?.message ?? `Request failed with status ${response.status}`,
        parsed.error?.details,
      );
    }

    return JSON.parse(responseBody) as T;
  }

  private buildQuery(params: Record<string, unknown>): string {
    const parts: string[] = [];
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
      }
    }
    return parts.length > 0 ? `?${parts.join('&')}` : '';
  }
}
