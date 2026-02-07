/**
 * Base error class for Stablecoin Gateway SDK errors
 */
export class StablecoinGatewayError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StablecoinGatewayError';
    Object.setPrototypeOf(this, StablecoinGatewayError.prototype);
  }
}

/**
 * Error thrown when API requests fail
 */
export class ApiError extends StablecoinGatewayError {
  /**
   * HTTP status code
   */
  readonly statusCode: number;

  /**
   * Error code from the API
   */
  readonly code: string;

  /**
   * Additional error details
   */
  readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  /**
   * Check if this is a validation error (400)
   */
  isValidationError(): boolean {
    return this.statusCode === 400;
  }

  /**
   * Check if this is an authentication error (401)
   */
  isAuthenticationError(): boolean {
    return this.statusCode === 401;
  }

  /**
   * Check if this is a permission error (403)
   */
  isPermissionError(): boolean {
    return this.statusCode === 403;
  }

  /**
   * Check if this is a not found error (404)
   */
  isNotFoundError(): boolean {
    return this.statusCode === 404;
  }

  /**
   * Check if this is a rate limit error (429)
   */
  isRateLimitError(): boolean {
    return this.statusCode === 429;
  }

  /**
   * Check if this is a server error (5xx)
   */
  isServerError(): boolean {
    return this.statusCode >= 500 && this.statusCode < 600;
  }
}

/**
 * Error thrown when webhook signature verification fails
 */
export class WebhookSignatureError extends StablecoinGatewayError {
  constructor(message: string = 'Invalid webhook signature') {
    super(message);
    this.name = 'WebhookSignatureError';
    Object.setPrototypeOf(this, WebhookSignatureError.prototype);
  }
}

/**
 * Error thrown when a request times out
 */
export class TimeoutError extends StablecoinGatewayError {
  /**
   * Timeout value in milliseconds
   */
  readonly timeout: number;

  constructor(timeout: number) {
    super(`Request timed out after ${timeout}ms`);
    this.name = 'TimeoutError';
    this.timeout = timeout;
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

/**
 * Error thrown when configuration is invalid
 */
export class ConfigurationError extends StablecoinGatewayError {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }
}
