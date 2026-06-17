import { randomBytes, createHash } from 'crypto';

/**
 * Session token utilities (ADR-002). An opaque 32-byte random token is given to
 * the client in an httpOnly cookie; only its SHA-256 hash is stored in the
 * `Session` table — so a DB leak does not expose usable tokens.
 */
export const SESSION_COOKIE_NAME = 'sf_session';

/** Session lifetime: 7 days. */
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function sessionExpiry(from: Date = new Date()): Date {
  return new Date(from.getTime() + SESSION_TTL_MS);
}

/** Cookie options for the session cookie. Secure is off in test/dev over http. */
export function sessionCookieOptions(): {
  httpOnly: true;
  secure: boolean;
  sameSite: 'lax';
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  };
}
