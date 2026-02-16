import { apiFetch } from '@/lib/api';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

describe('apiFetch', () => {
  it('calls fetch with correct URL and Content-Type header', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: 'test' }),
    });

    await apiFetch('/api/posts');

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:5010/api/posts',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  it('returns parsed JSON on successful response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: '1', title: 'Test' }),
    });

    const result = await apiFetch('/api/posts');
    expect(result).toEqual({ id: '1', title: 'Test' });
  });

  it('passes custom options and headers through to fetch', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    await apiFetch('/api/posts', {
      method: 'POST',
      body: JSON.stringify({ title: 'New' }),
      headers: { Authorization: 'Bearer token123' },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:5010/api/posts',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ title: 'New' }),
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer token123',
        }),
      })
    );
  });

  it('throws an error on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Not Found',
      json: async () => ({}),
    });

    await expect(apiFetch('/api/missing')).rejects.toThrow('Not Found');
  });

  it('extracts detail from RFC 7807 response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Bad Request',
      json: async () => ({
        type: 'https://example.com/errors/validation',
        title: 'Validation Error',
        detail: 'The title field is required',
        status: 400,
      }),
    });

    await expect(apiFetch('/api/posts')).rejects.toThrow('The title field is required');
  });

  it('falls back to title when detail is absent in RFC 7807 response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Bad Request',
      json: async () => ({
        title: 'Validation Error',
        status: 400,
      }),
    });

    await expect(apiFetch('/api/posts')).rejects.toThrow('Validation Error');
  });

  it('formats field errors from err.errors object', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Unprocessable Entity',
      json: async () => ({
        detail: 'Validation failed',
        errors: {
          title: ['is required', 'must be a string'],
          format: ['is invalid'],
        },
      }),
    });

    await expect(apiFetch('/api/posts')).rejects.toThrow(
      'title: is required, must be a string; format: is invalid'
    );
  });

  it('falls back to statusText when JSON parsing fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Internal Server Error',
      json: async () => { throw new Error('not json'); },
    });

    await expect(apiFetch('/api/posts')).rejects.toThrow('Internal Server Error');
  });
});
