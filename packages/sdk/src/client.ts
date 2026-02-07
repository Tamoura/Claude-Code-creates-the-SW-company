import { ApiError, ConfigurationError, TimeoutError } from './errors';
import type {
  SDKOptions,
  CreatePaymentSessionParams,
  PaymentSession,
  ListPaymentSessionsParams,
  PaginatedResponse,
  CreateRefundParams,
  Refund,
} from './types';

/**
 * Default configuration values
 */
const DEFAULT_BASE_URL = 'https://api.stablecoin-gateway.com';
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_RETRIES = 3;

/**
 * HTTP methods
 */
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

/**
 * Request options
 */
interface RequestOptions {
  method: HttpMethod;
  path: string;
  body?: unknown;
  query?: Record<string, string | number | undefined>;
}

/**
 * Stablecoin Gateway SDK Client
 *
 * @example
 * ```typescript
 * import { StablecoinGateway } from '@stablecoin-gateway/sdk';
 *
 * const gateway = new StablecoinGateway('your-api-key');
 *
 * // Create a payment session
 * const session = await gateway.createPaymentSession({
 *   amount: 100,
 *   currency: 'USD',
 *   merchant_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
 *   description: 'Payment for order #123',
 * });
 *
 * console.log('Checkout URL:', session.checkout_url);
 * ```
 */
export class StablecoinGateway {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly retries: number;

  /**
   * Create a new Stablecoin Gateway client
   *
   * @param apiKey - Your API key from the dashboard
   * @param options - Optional configuration options
   * @throws ConfigurationError if API key is missing or invalid
   */
  constructor(apiKey: string, options: SDKOptions = {}) {
    if (!apiKey || typeof apiKey !== 'string') {
      throw new ConfigurationError('API key is required');
    }

    if (apiKey.trim().length === 0) {
      throw new ConfigurationError('API key cannot be empty');
    }

    this.apiKey = apiKey;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
    this.retries = options.retries ?? DEFAULT_RETRIES;
  }

  /**
   * Make an HTTP request to the API
   */
  private async request<T>(options: RequestOptions): Promise<T> {
    const { method, path, body, query } = options;

    // Build URL with query parameters
    const url = new URL(`${this.baseUrl}${path}`);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    // Build request options
    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': '@stablecoin-gateway/sdk/1.0.0',
      },
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      fetchOptions.body = JSON.stringify(body);
    }

    // Execute request with retries
    let lastError: Error | undefined;
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const response = await this.fetchWithTimeout(
          url.toString(),
          fetchOptions
        );

        // Parse response
        const data = (await response.json().catch(() => null)) as Record<
          string,
          unknown
        > | null;

        // Handle error responses
        if (!response.ok) {
          throw new ApiError(
            (data?.detail as string) ||
              (data?.message as string) ||
              `HTTP ${response.status}`,
            response.status,
            (data?.code as string) || 'UNKNOWN_ERROR',
            data?.details as Record<string, unknown> | undefined
          );
        }

        return data as T;
      } catch (error) {
        lastError = error as Error;

        // Don't retry for client errors (4xx) except 429
        if (error instanceof ApiError) {
          if (error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 429) {
            throw error;
          }
        }

        // Wait before retrying
        if (attempt < this.retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          await this.sleep(delay);
        }
      }
    }

    throw lastError!;
  }

  /**
   * Fetch with timeout support
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw new TimeoutError(this.timeout);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Sleep helper for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Create a new payment session
   *
   * @param params - Payment session parameters
   * @returns Created payment session
   *
   * @example
   * ```typescript
   * const session = await gateway.createPaymentSession({
   *   amount: 100,
   *   currency: 'USD',
   *   merchant_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
   *   description: 'Payment for order #123',
   *   success_url: 'https://example.com/success',
   *   cancel_url: 'https://example.com/cancel',
   * });
   * ```
   */
  async createPaymentSession(
    params: CreatePaymentSessionParams
  ): Promise<PaymentSession> {
    return this.request<PaymentSession>({
      method: 'POST',
      path: '/v1/payment-sessions',
      body: params,
    });
  }

  /**
   * Get a payment session by ID
   *
   * @param id - Payment session ID
   * @returns Payment session details
   *
   * @example
   * ```typescript
   * const session = await gateway.getPaymentSession('ps_abc123');
   * console.log('Status:', session.status);
   * ```
   */
  async getPaymentSession(id: string): Promise<PaymentSession> {
    if (!id || typeof id !== 'string') {
      throw new ConfigurationError('Payment session ID is required');
    }

    return this.request<PaymentSession>({
      method: 'GET',
      path: `/v1/payment-sessions/${encodeURIComponent(id)}`,
    });
  }

  /**
   * List payment sessions with optional filtering and pagination
   *
   * @param params - Optional list parameters
   * @returns Paginated list of payment sessions
   *
   * @example
   * ```typescript
   * // List all pending payments
   * const { data, pagination } = await gateway.listPaymentSessions({
   *   status: 'PENDING',
   *   limit: 10,
   * });
   *
   * console.log(`Found ${pagination.total} pending payments`);
   * ```
   */
  async listPaymentSessions(
    params: ListPaymentSessionsParams = {}
  ): Promise<PaginatedResponse<PaymentSession>> {
    return this.request<PaginatedResponse<PaymentSession>>({
      method: 'GET',
      path: '/v1/payment-sessions',
      query: {
        status: params.status,
        limit: params.limit,
        offset: params.offset,
      },
    });
  }

  /**
   * Create a refund for a payment
   *
   * @param paymentId - Payment session ID to refund
   * @param params - Optional refund parameters
   * @returns Created refund
   *
   * @example
   * ```typescript
   * // Full refund
   * const refund = await gateway.createRefund('ps_abc123', {
   *   reason: 'Customer requested refund',
   * });
   *
   * // Partial refund
   * const partialRefund = await gateway.createRefund('ps_abc123', {
   *   amount: 50,
   *   reason: 'Partial refund for damaged item',
   * });
   * ```
   */
  async createRefund(
    paymentId: string,
    params: CreateRefundParams = {}
  ): Promise<Refund> {
    if (!paymentId || typeof paymentId !== 'string') {
      throw new ConfigurationError('Payment ID is required for refund');
    }

    return this.request<Refund>({
      method: 'POST',
      path: '/v1/refunds',
      body: {
        payment_id: paymentId,
        ...params,
      },
    });
  }

  /**
   * Get a refund by ID
   *
   * @param id - Refund ID
   * @returns Refund details
   *
   * @example
   * ```typescript
   * const refund = await gateway.getRefund('ref_xyz789');
   * console.log('Refund status:', refund.status);
   * ```
   */
  async getRefund(id: string): Promise<Refund> {
    if (!id || typeof id !== 'string') {
      throw new ConfigurationError('Refund ID is required');
    }

    return this.request<Refund>({
      method: 'GET',
      path: `/v1/refunds/${encodeURIComponent(id)}`,
    });
  }

  /**
   * List refunds with optional pagination
   *
   * @param params - Optional list parameters
   * @returns Paginated list of refunds
   *
   * @example
   * ```typescript
   * const { data, pagination } = await gateway.listRefunds({
   *   limit: 10,
   * });
   * ```
   */
  async listRefunds(
    params: { limit?: number; offset?: number } = {}
  ): Promise<PaginatedResponse<Refund>> {
    return this.request<PaginatedResponse<Refund>>({
      method: 'GET',
      path: '/v1/refunds',
      query: {
        limit: params.limit,
        offset: params.offset,
      },
    });
  }
}
