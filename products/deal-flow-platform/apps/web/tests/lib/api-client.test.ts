import { apiClient } from '@/lib/api-client';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('ApiClient', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    apiClient.setAccessToken(null);
  });

  describe('GET requests', () => {
    it('makes GET request to correct URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: '1', titleEn: 'Test Deal' } }),
      });

      await apiClient.get('/deals/1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/deals/1'),
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('includes Content-Type header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      await apiClient.get('/deals');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('includes Authorization header when token is set', async () => {
      apiClient.setAccessToken('test-token-123');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: {} }),
      });

      await apiClient.get('/investors/profile');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token-123',
          }),
        })
      );
    });

    it('does not include Authorization header when no token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: {} }),
      });

      await apiClient.get('/deals');

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers.Authorization).toBeUndefined();
    });

    it('includes credentials for cookie support', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: {} }),
      });

      await apiClient.get('/deals');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ credentials: 'include' })
      );
    });
  });

  describe('POST requests', () => {
    it('sends POST with JSON body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { accessToken: 'token' } }),
      });

      await apiClient.post('/auth/login', {
        email: 'test@test.qa',
        password: 'Test123!',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/login'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            email: 'test@test.qa',
            password: 'Test123!',
          }),
        })
      );
    });

    it('sends POST without body when data is undefined', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: {} }),
      });

      await apiClient.post('/auth/logout');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: undefined,
        })
      );
    });
  });

  describe('PATCH requests', () => {
    it('sends PATCH with JSON body', async () => {
      apiClient.setAccessToken('token');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { titleEn: 'Updated' } }),
      });

      await apiClient.patch('/deals/1', { titleEn: 'Updated' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/deals/1'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ titleEn: 'Updated' }),
        })
      );
    });
  });

  describe('DELETE requests', () => {
    it('sends DELETE request', async () => {
      apiClient.setAccessToken('token');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { message: 'deleted' } }),
      });

      await apiClient.delete('/watchlist/deal-1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/watchlist/deal-1'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('getList', () => {
    it('returns list response with meta', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ id: '1' }, { id: '2' }],
          meta: { total: 2, limit: 20, nextCursor: null },
        }),
      });

      const result = await apiClient.getList('/deals');

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });
  });

  describe('error handling', () => {
    it('throws on non-OK response with API error message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          error: 'DEAL_NOT_FOUND',
          message: 'Deal not found',
          statusCode: 404,
        }),
      });

      await expect(apiClient.get('/deals/999')).rejects.toThrow('Deal not found');
    });

    it('throws generic error when response body is not JSON', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => { throw new Error('not json'); },
      });

      await expect(apiClient.get('/deals')).rejects.toThrow('An unknown error occurred');
    });

    it('throws on 401 unauthorized', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: 'UNAUTHORIZED',
          message: 'Invalid token',
          statusCode: 401,
        }),
      });

      await expect(apiClient.get('/investors/profile')).rejects.toThrow('Invalid token');
    });
  });

  describe('token management', () => {
    it('updates token via setAccessToken', async () => {
      apiClient.setAccessToken('first-token');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: {} }),
      });

      await apiClient.get('/test');
      let headers = mockFetch.mock.calls[0][1].headers;
      expect(headers.Authorization).toBe('Bearer first-token');

      apiClient.setAccessToken('second-token');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: {} }),
      });

      await apiClient.get('/test');
      headers = mockFetch.mock.calls[1][1].headers;
      expect(headers.Authorization).toBe('Bearer second-token');
    });

    it('clears token when set to null', async () => {
      apiClient.setAccessToken('some-token');
      apiClient.setAccessToken(null);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: {} }),
      });

      await apiClient.get('/test');
      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers.Authorization).toBeUndefined();
    });
  });
});
