type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogData {
  [key: string]: unknown;
}

/** Keys whose values should be redacted from log output. */
const SENSITIVE_PATTERNS = [
  'password', 'secret', 'token', 'authorization',
  'apikey', 'api_key', 'private_key', 'privatekey',
  'credit_card', 'creditcard', 'ssn', 'cookie',
  'encryption_key', 'hmac', 'mnemonic', 'seed_phrase',
];

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

class Logger {
  private logLevel: LogLevel;

  constructor() {
    this.logLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  private log(level: LogLevel, message: string, data?: LogData) {
    if (!this.shouldLog(level)) return;

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
    } else if (process.env.NODE_ENV !== 'test') {
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
    this.log('debug', message, data);
  }
}

export const logger = new Logger();
