/**
 * Structured Logger with PII Redaction
 *
 * Production: JSON output via Pino
 * Development: Human-readable colored output via pino-pretty
 *
 * Sensitive fields (password, token, key, etc.) are automatically
 * redacted from all log output to prevent PII leakage.
 */

import pino from 'pino';

/** Keys whose values should be redacted from log output. */
const SENSITIVE_PATTERNS = [
  'password', 'secret', 'token', 'authorization',
  'apikey', 'api_key', 'private_key', 'privatekey',
  'credit_card', 'creditcard', 'ssn', 'cookie',
  'encryption_key', 'hmac', 'mnemonic', 'seed_phrase',
  'key', 'hash',
];

type LogData = Record<string, unknown>;

/**
 * Recursively redact sensitive fields from a data object.
 * Returns a new object with sensitive values replaced by '[REDACTED]'.
 */
function redactSensitiveFields(data: LogData): LogData {
  const redacted: LogData = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_PATTERNS.some((p) => lowerKey.includes(p))) {
      redacted[key] = '[REDACTED]';
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      redacted[key] = redactSensitiveFields(value as LogData);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

const isProduction = process.env.NODE_ENV === 'production';

const pinoInstance = pino({
  level: process.env.LOG_LEVEL || 'info',
  ...(isProduction
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: {
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        },
      }),
});

class Logger {
  info(message: string, data?: LogData): void {
    const safeData = data ? redactSensitiveFields(data) : undefined;
    if (safeData) {
      pinoInstance.info(safeData, message);
    } else {
      pinoInstance.info(message);
    }
  }

  warn(message: string, data?: LogData): void {
    const safeData = data ? redactSensitiveFields(data) : undefined;
    if (safeData) {
      pinoInstance.warn(safeData, message);
    } else {
      pinoInstance.warn(message);
    }
  }

  error(message: string, error?: Error | unknown, data?: LogData): void {
    const errorData: LogData = {
      ...data,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
    };
    const safeData = redactSensitiveFields(errorData);
    pinoInstance.error(safeData, message);
  }

  debug(message: string, data?: LogData): void {
    const safeData = data ? redactSensitiveFields(data) : undefined;
    if (safeData) {
      pinoInstance.debug(safeData, message);
    } else {
      pinoInstance.debug(message);
    }
  }
}

export const logger = new Logger();
