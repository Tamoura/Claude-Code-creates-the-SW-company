export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  /**
   * RISK-080: Whether this error is retryable.
   * Returns true for rate-limited (429) and server errors (5xx),
   * except for timeout (status 0) which is also retryable.
   */
  get isRetryable(): boolean {
    return this.statusCode === 0 || this.statusCode === 429 || this.statusCode >= 500;
  }

  /**
   * RISK-080: Suggested delay in milliseconds before retrying.
   * Returns null if the error is not retryable.
   * For 429 responses, uses a default 1-second delay (callers should
   * check Retry-After headers for the actual value).
   */
  get retryAfterMs(): number | null {
    if (!this.isRetryable) return null;
    if (this.statusCode === 429) return 1000;
    if (this.statusCode === 0) return 5000; // timeout — wait longer
    return 2000; // 5xx
  }

  toJSON() {
    return {
      name: this.name,
      statusCode: this.statusCode,
      code: this.code,
      message: this.message,
      details: this.details,
      isRetryable: this.isRetryable,
      retryAfterMs: this.retryAfterMs,
    };
  }
}
