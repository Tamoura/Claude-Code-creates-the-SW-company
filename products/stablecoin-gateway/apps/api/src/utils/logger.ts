type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogData {
  [key: string]: unknown;
}

const SENSITIVE_PATTERNS = ['password', 'secret', 'token', 'key', 'authorization'];

function redactSensitiveKeys(data: LogData): LogData {
  const result: LogData = {};
  for (const [k, v] of Object.entries(data)) {
    const lower = k.toLowerCase();
    if (SENSITIVE_PATTERNS.some((p) => lower.includes(p))) {
      result[k] = '[REDACTED]';
    } else if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Error)) {
      result[k] = redactSensitiveKeys(v as LogData);
    } else {
      result[k] = v;
    }
  }
  return result;
}

class Logger {
  private logLevel: LogLevel;

  constructor() {
    this.logLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
  }

  private log(level: LogLevel, message: string, data?: LogData) {
    const timestamp = new Date().toISOString();
    const safeData = data ? redactSensitiveKeys(data) : undefined;
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
