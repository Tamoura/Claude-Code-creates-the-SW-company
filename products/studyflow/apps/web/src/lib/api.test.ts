import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api } from './api';

function mockFetch(impl: (url: string, init: RequestInit) => Response) {
  const spy = vi.fn((input: RequestInfo | URL, init?: RequestInit) =>
    Promise.resolve(impl(String(input), init ?? {}))
  );
  vi.stubGlobal('fetch', spy);
  return spy;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('api client', () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.unstubAllGlobals());

  it('sends credentials: include on every request (session cookie auth)', async () => {
    const spy = mockFetch(() =>
      jsonResponse({ student: { id: '1', email: 'a@b.co', activeTerm: '2026-S1' } })
    );

    await api.auth.me();

    expect(spy).toHaveBeenCalledTimes(1);
    const init = spy.mock.calls[0][1] as RequestInit;
    expect(init.credentials).toBe('include');
  });

  it('serializes JSON bodies with a content-type header', async () => {
    const spy = mockFetch(() => jsonResponse({ student: {} }, 201));

    await api.auth.signup('Test@X.com', 'password123');

    const [url, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/v1/auth/signup');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      email: 'Test@X.com',
      password: 'password123',
    });
  });

  it('parses RFC 7807 problem+json into a typed ApiError', async () => {
    mockFetch(() =>
      jsonResponse(
        {
          type: 'about:blank',
          title: 'Unauthorized',
          status: 401,
          detail: 'email or password invalid',
        },
        401
      )
    );

    await expect(api.auth.login('a@b.co', 'x')).rejects.toMatchObject({
      status: 401,
      detail: 'email or password invalid',
    });

    try {
      await api.auth.login('a@b.co', 'x');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).isUnauthorized).toBe(true);
    }
  });

  it('exposes field errors from the problem body', async () => {
    mockFetch(() =>
      jsonResponse(
        { status: 400, title: 'Bad Request', errors: { email: 'Invalid email' } },
        400
      )
    );

    try {
      await api.subjects.create({ name: '' });
    } catch (err) {
      expect((err as ApiError).fieldErrors).toEqual({ email: 'Invalid email' });
    }
  });

  it('treats 409 as a conflict (e.g. duplicate selection)', async () => {
    mockFetch(() => jsonResponse({ status: 409, detail: 'duplicate' }, 409));

    try {
      await api.selections.add('subject-id');
    } catch (err) {
      expect((err as ApiError).isConflict).toBe(true);
    }
  });

  it('returns undefined for 204 No Content (e.g. delete)', async () => {
    mockFetch(() => new Response(null, { status: 204 }));

    await expect(api.selections.remove('sel-1')).resolves.toBeUndefined();
  });

  it('builds query strings, skipping empty values', async () => {
    const spy = mockFetch(() => jsonResponse({ data: [] }));

    await api.subjects.list({ q: 'math', credits: undefined, limit: 50 });

    const url = spy.mock.calls[0][0] as string;
    expect(url).toContain('q=math');
    expect(url).toContain('limit=50');
    expect(url).not.toContain('credits=');
  });

  it('wraps network failures in a friendly ApiError (status 0)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch')))
    );

    try {
      await api.dashboard.get();
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(0);
    }
  });
});
