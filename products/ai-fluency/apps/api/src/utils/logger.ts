/**
 * logger.ts — Structured logging with PII redaction
 *
 * - JSON output in production (for log aggregation)
 * - Human-readable output in development
 * - Automatic PII redaction on sensitive field names
 * - NEVER use console.log in application code — use this logger
 */

type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface LogData {
  [key: string]: unknown;
}

/** Substring patterns: any key containing one of these is redacted. */
const SENSITIVE_SUBSTRINGS = [
  'password',
  'secret',
  'token',
  'authorization',
  'apikey',
  'api_key',
  'private_key',
  'privatekey',
  'credit_card',
  'creditcard',
  'ssn',
  'cookie',
  'encryption_key',
  'hmac',
  'mnemonic',
  'seed_phrase',
  'email',
];

/** Exact-match patterns (case-insensitive) — prevents short strings matching unrelated keys. */
const SENSITIVE_EXACT = new Set([
  'ip',
  'client_ip',
  'clientip',
  'remote_ip',
  'remoteip',
  'x_forwarded_for',
  'x-forwarded-for',
]);

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
  private readonly logLevel: LogLevel;

  constructor() {
    this.logLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  private log(level: LogLevel, message: string, data?: LogData): void {
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
      process.stdout.write(JSON.stringify(logEntry) + '\n');
    } else if (process.env.NODE_ENV !== 'test') {
      // Suppress logs in test to keep output clean
      const dataStr = safeData ? JSON.stringify(safeData, null, 2) : '';
      process.stdout.write(
        `[${timestamp}] ${level.toUpperCase()}: ${message}${dataStr ? ' ' + dataStr : ''}\n`
      );
    }
  }

  trace(message: string, data?: LogData): void {
    this.log('trace', message, data);
  }

  debug(message: string, data?: LogData): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: LogData): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: LogData): void {
    this.log('warn', message, data);
  }

  error(message: string, err?: Error | unknown, data?: LogData): void {
    const errorData: LogData = {
      ...data,
      ...(err !== undefined
        ? {
            error:
              err instanceof Error
                ? { name: err.name, message: err.message, stack: err.stack }
                : err,
          }
        : {}),
    };
    this.log('error', message, errorData);
  }

  fatal(message: string, err?: Error | unknown, data?: LogData): void {
    const errorData: LogData = {
      ...data,
      ...(err !== undefined
        ? {
            error:
              err instanceof Error
                ? { name: err.name, message: err.message, stack: err.stack }
                : err,
          }
        : {}),
    };
    this.log('fatal', message, errorData);
  }
}

export const logger = new Logger();
