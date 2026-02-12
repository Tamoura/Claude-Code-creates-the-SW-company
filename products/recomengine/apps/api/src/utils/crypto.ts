import crypto from 'crypto';
import bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 12;
const API_KEY_HMAC_SECRET = process.env.API_KEY_HMAC_SECRET || '';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function hashApiKey(key: string): string {
  if (API_KEY_HMAC_SECRET) {
    return crypto.createHmac('sha256', API_KEY_HMAC_SECRET).update(key).digest('hex');
  }
  return crypto.createHash('sha256').update(key).digest('hex');
}

export function generateApiKey(environment: 'live' | 'test' = 'live'): string {
  const prefix = `rk_${environment}_`;
  const random = crypto.randomBytes(24).toString('base64url');
  return `${prefix}${random}`;
}

export function getKeyPrefix(key: string): string {
  return key.substring(0, 12);
}

export function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
