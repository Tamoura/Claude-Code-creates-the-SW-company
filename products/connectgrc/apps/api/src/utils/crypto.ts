import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function hashApiKey(apiKey: string, hmacSecret?: string): string {
  const secret = hmacSecret || process.env.API_KEY_HMAC_SECRET;
  if (secret) {
    return crypto.createHmac('sha256', secret).update(apiKey).digest('hex');
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'API_KEY_HMAC_SECRET is required in production. ' +
      'Generate a secret: openssl rand -hex 64'
    );
  }
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

export function generateApiKey(prefix = 'grc_live'): string {
  const randomBytes = crypto.randomBytes(32).toString('hex');
  return `${prefix}_${randomBytes}`;
}

export function getApiKeyPrefix(apiKey: string): string {
  return apiKey.substring(0, 16) + '...';
}

export function generateToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function generatePrefixedId(prefix: string, bytes = 16): string {
  return `${prefix}_${crypto.randomBytes(bytes).toString('hex')}`;
}
