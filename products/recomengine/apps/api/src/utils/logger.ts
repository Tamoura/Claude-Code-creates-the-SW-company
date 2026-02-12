const SENSITIVE_PATTERNS = [
  'password', 'secret', 'token', 'authorization', 'apikey', 'api_key',
  'private_key', 'creditcard', 'ssn', 'cookie', 'encryption_key',
  'hmac', 'mnemonic', 'seed_phrase',
];

function redactSensitive(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(redactSensitive);
  }

  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_PATTERNS.some((p) => lowerKey.includes(p))) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactSensitive(value);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

const LOG_LEVEL = (process.env.LOG_LEVEL || 'info').toLowerCase();
const LEVELS: Record<string, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLevel = LEVELS[LOG_LEVEL] ?? 1;
const isProduction = process.env.NODE_ENV === 'production';

function formatMessage(level: string, message: string, data?: unknown): string {
  const timestamp = new Date().toISOString();
  const safeData = data ? redactSensitive(data) : undefined;

  if (isProduction) {
    return JSON.stringify({ timestamp, level, message, ...(safeData as object) });
  }

  const dataStr = safeData ? ` ${JSON.stringify(safeData)}` : '';
  return `[${timestamp}] ${level.toUpperCase()}: ${message}${dataStr}`;
}

export const logger = {
  debug(message: string, data?: unknown) {
    if (currentLevel <= 0) console.debug(formatMessage('debug', message, data));
  },
  info(message: string, data?: unknown) {
    if (currentLevel <= 1) console.info(formatMessage('info', message, data));
  },
  warn(message: string, data?: unknown) {
    if (currentLevel <= 2) console.warn(formatMessage('warn', message, data));
  },
  error(message: string, data?: unknown) {
    if (currentLevel <= 3) {
      if (data instanceof Error) {
        console.error(formatMessage('error', message, {
          error: data.message,
          stack: data.stack,
        }));
      } else {
        console.error(formatMessage('error', message, data));
      }
    }
  },
};
