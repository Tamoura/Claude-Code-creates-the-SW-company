type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogData {
  [key: string]: unknown;
}

/** Substring patterns: any key containing these substrings is redacted. */
const SENSITIVE_SUBSTRINGS = [
  'password', 'secret', 'token', 'authorization',
  'apikey', 'api_key', 'private_key', 'privatekey',
  'credit_card', 'creditcard', 'ssn', 'cookie',
  'encryption_key', 'hmac', 'mnemonic', 'seed_phrase',
  'email', 'ipaddress', 'ip_address',
];

/**
 * Exact-match patterns: only keys that match exactly (case-insensitive) are
 * redacted. This prevents short tokens like "ip" from matching unrelated keys
 * such as "description" or "script".
 */
const SENSITIVE_EXACT = new Set([
  'ip', 'client_ip', 'clientip', 'remote_ip', 'remoteip',
  'x_forwarded_for', 'x-forwarded-for',
]);

/**
 * Recursively redact sensitive fields from a data object.
 * Returns a new object with sensitive values replaced by '[REDACTED]'.
 */
function redactSensitiveFields(data: LogData): LogData {
  const redacted: LogData = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    const isSensitive =
      SENSITIVE_EXACT.has(lowerKey) ||
      SENSITIVE_SUBSTRINGS.some((p) => lowerKey.includes(p));
    if (isSensitive) {
      redacted[key] = '[REDACTED]';
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      redacted[key] = redactSensitiveFields(value as LogData);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

class Logger {
  private logLevel: LogLevel;

  constructor() {
    this.logLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
  }

  private log(level: LogLevel, message: string, data?: LogData) {
    const safeData = data ? redactSensitiveFields(data) : undefined;
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...safeData,
    };

    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify(logEntry));
    } else {
      console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`, safeData || '');
    }
  }

  info(message: string, data?: LogData) {
    this.log('info', message, data);
  }

  warn(message: string, data?: LogData) {
    this.log('warn', message, data);
  }

  error(message: string, error?: Error | unknown, data?: LogData) {
    const errorData = {
      ...data,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
    };
    this.log('error', message, errorData);
  }

  debug(message: string, data?: LogData) {
    if (this.logLevel === 'debug') {
      this.log('debug', message, data);
    }
  }
}

export const logger = new Logger();
