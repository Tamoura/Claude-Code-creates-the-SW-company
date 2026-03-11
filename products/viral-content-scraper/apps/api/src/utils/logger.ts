const SENSITIVE_KEYS = ['password', 'secret', 'token', 'apikey', 'authorization'];

function redact(obj: unknown): unknown {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(redact);

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.some((s) => key.toLowerCase().includes(s))) {
      result[key] = '[REDACTED]';
    } else {
      result[key] = redact(value);
    }
  }
  return result;
}

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LEVELS: Record<string, number> = { debug: 0, info: 1, warn: 2, error: 3 };

function shouldLog(level: string): boolean {
  return (LEVELS[level] ?? 1) >= (LEVELS[LOG_LEVEL] ?? 1);
}

function formatMessage(level: string, message: string, data?: unknown): string {
  const timestamp = new Date().toISOString();
  const base = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
  if (data !== undefined) {
    return `${base} ${JSON.stringify(redact(data))}`;
  }
  return base;
}

export const logger = {
  debug(message: string, data?: unknown) {
    if (shouldLog('debug')) console.debug(formatMessage('debug', message, data));
  },
  info(message: string, data?: unknown) {
    if (shouldLog('info')) console.info(formatMessage('info', message, data));
  },
  warn(message: string, data?: unknown) {
    if (shouldLog('warn')) console.warn(formatMessage('warn', message, data));
  },
  error(message: string, data?: unknown) {
    if (shouldLog('error')) console.error(formatMessage('error', message, data));
  },
};
