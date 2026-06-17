import './env';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';

export async function buildTestApp(): Promise<FastifyInstance> {
  return buildApp({ logger: false });
}

export interface AuthedStudent {
  cookie: string;
  studentId: string;
  email: string;
}

let counter = 0;

/**
 * Signs up a fresh student through the real HTTP path and returns the
 * `sf_session` cookie to use on subsequent authenticated requests.
 */
export async function signupStudent(
  app: FastifyInstance,
  overrides: { email?: string; password?: string } = {}
): Promise<AuthedStudent> {
  counter += 1;
  const email = overrides.email ?? `student${counter}.${Date.now()}@test.dev`;
  const password = overrides.password ?? 'SecurePass123!';

  const res = await app.inject({
    method: 'POST',
    url: '/v1/auth/signup',
    payload: { email, password },
  });

  if (res.statusCode !== 201) {
    throw new Error(
      `signupStudent failed (${res.statusCode}): ${res.body}`
    );
  }

  const cookie = extractSessionCookie(res.headers['set-cookie']);
  const body = res.json();
  return { cookie, studentId: body.student.id, email: body.student.email };
}

/** Extracts the `sf_session=...` cookie pair from a Set-Cookie header value. */
export function extractSessionCookie(
  setCookie: string | string[] | undefined
): string {
  const headers = Array.isArray(setCookie)
    ? setCookie
    : setCookie
      ? [setCookie]
      : [];
  const session = headers.find((h) => h.startsWith('sf_session='));
  if (!session) {
    throw new Error('No sf_session cookie set');
  }
  return session.split(';')[0]; // "sf_session=<token>"
}
