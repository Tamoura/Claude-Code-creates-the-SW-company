/**
 * The API client is the single place the error envelope is unwrapped. If this
 * drifts from `apps/api/src/lib/response.ts` the whole UI loses its error
 * handling silently, so both sides are pinned by tests.
 */
import { ApiError, apiFetch, API_BASE_URL } from '../api';

const originalFetch = global.fetch;

function mockResponse(body: unknown, init: { ok: boolean; status: number; statusText?: string }) {
  return {
    ok: init.ok,
    status: init.status,
    statusText: init.statusText ?? '',
    json: async () => body,
  } as Response;
}

describe('ApiError', () => {
  it('carries the API error envelope fields', () => {
    const error = new ApiError(404, 'NOT_FOUND', 'Resource not found', 'req-1');
    expect(error.status).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
    expect(error.requestId).toBe('req-1');
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ApiError');
  });
});

describe('apiFetch', () => {
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('targets the registered API port by default', () => {
    expect(API_BASE_URL).toContain('5018');
  });

  it('returns the parsed body on success', async () => {
    global.fetch = jest.fn(async () =>
      mockResponse({ id: 'abc' }, { ok: true, status: 200 })
    ) as unknown as typeof fetch;

    await expect(apiFetch<{ id: string }>('/health')).resolves.toEqual({ id: 'abc' });
  });

  it('sends credentials and JSON content type', async () => {
    const spy = jest.fn(async (_url: string, _init?: RequestInit) =>
      mockResponse({}, { ok: true, status: 200 })
    );
    global.fetch = spy as unknown as typeof fetch;

    await apiFetch('/health');

    expect(spy).toHaveBeenCalledWith(
      `${API_BASE_URL}/health`,
      expect.objectContaining({
        credentials: 'include',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      })
    );
  });

  it('lets the caller add headers without losing the defaults', async () => {
    const spy = jest.fn(async (_url: string, _init?: RequestInit) =>
      mockResponse({}, { ok: true, status: 200 })
    );
    global.fetch = spy as unknown as typeof fetch;

    await apiFetch('/health', { headers: { 'X-Request-ID': 'corr-9' } });

    const init = spy.mock.calls[0]?.[1];
    expect(init?.headers).toMatchObject({
      'Content-Type': 'application/json',
      'X-Request-ID': 'corr-9',
    });
  });

  it('unwraps the error envelope into an ApiError', async () => {
    global.fetch = jest.fn(async () =>
      mockResponse(
        { error: { code: 'QUOTA_EXCEEDED', message: 'no allowance left', requestId: 'r1' } },
        { ok: false, status: 402 }
      )
    ) as unknown as typeof fetch;

    await expect(apiFetch('/instances')).rejects.toMatchObject({
      status: 402,
      code: 'QUOTA_EXCEEDED',
      message: 'no allowance left',
      requestId: 'r1',
    });
  });

  it('falls back cleanly when the error body is not JSON', async () => {
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      json: async () => {
        throw new Error('not json');
      },
    })) as unknown as typeof fetch;

    await expect(apiFetch('/instances')).rejects.toMatchObject({
      status: 502,
      code: 'UNKNOWN',
      message: 'Bad Gateway',
    });
  });
});
