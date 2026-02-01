import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We need to mock fetch before importing the module
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Must import after mocking
import {
  login,
  register,
  logout,
  generateInvoice,
  listInvoices,
  getInvoice,
  updateInvoice,
  deleteInvoice,
  sendInvoice,
  listClients,
  getPublicInvoice,
  getProfile,
  apiFetch,
} from '../api';

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('login', () => {
    it('sends POST to /auth/login with credentials', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            user: { id: '1', email: 'test@test.com', name: 'Test' },
            accessToken: 'token123',
          }),
      });

      const result = await login('test@test.com', 'password123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/login'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'test@test.com', password: 'password123' }),
        })
      );
      expect(result.accessToken).toBe('token123');
    });

    it('stores accessToken in localStorage on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            user: { id: '1', email: 'test@test.com', name: 'Test' },
            accessToken: 'token123',
          }),
      });

      await login('test@test.com', 'password123');

      expect(localStorage.setItem).toHaveBeenCalledWith('accessToken', 'token123');
    });

    it('throws error on failed login', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Invalid credentials' }),
      });

      await expect(login('bad@test.com', 'wrong')).rejects.toThrow('Invalid credentials');
    });

    it('throws generic error when response body parse fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.reject(new Error('parse error')),
      });

      await expect(login('test@test.com', 'pw')).rejects.toThrow(
        'Login failed'
      );
    });
  });

  describe('register', () => {
    it('sends POST to /auth/register with user data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            user: { id: '1', email: 'new@test.com', name: 'New User' },
            accessToken: 'newtoken',
          }),
      });

      const result = await register('New User', 'new@test.com', 'password123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/register'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            name: 'New User',
            email: 'new@test.com',
            password: 'password123',
          }),
        })
      );
      expect(result.accessToken).toBe('newtoken');
    });

    it('stores token on successful registration', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            user: { id: '1', email: 'new@test.com', name: 'New' },
            accessToken: 'regtoken',
          }),
      });

      await register('New', 'new@test.com', 'pw');

      expect(localStorage.setItem).toHaveBeenCalledWith('accessToken', 'regtoken');
    });

    it('throws error on registration failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Email already exists' }),
      });

      await expect(register('Test', 'dup@test.com', 'pw')).rejects.toThrow(
        'Email already exists'
      );
    });
  });

  describe('logout', () => {
    it('removes accessToken from localStorage', async () => {
      localStorage.setItem('accessToken', 'token');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });

      await logout();

      expect(localStorage.removeItem).toHaveBeenCalledWith('accessToken');
    });

    it('removes token even if API call fails', async () => {
      localStorage.setItem('accessToken', 'token');
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await logout();

      expect(localStorage.removeItem).toHaveBeenCalledWith('accessToken');
    });
  });

  describe('apiFetch (via generateInvoice)', () => {
    it('attaches Authorization header when token exists', async () => {
      localStorage.setItem('accessToken', 'mytoken');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: '1', invoiceNumber: 'INV-001' }),
      });

      await generateInvoice('test prompt');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mytoken',
          }),
        })
      );
    });

    it('includes Content-Type header when body is present', async () => {
      localStorage.setItem('accessToken', 'token');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: '1' }),
      });

      await generateInvoice('prompt text');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('redirects to /login on 401 response', async () => {
      const hrefSetter = vi.fn();
      Object.defineProperty(window, 'location', {
        value: { href: '' },
        writable: true,
        configurable: true,
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Unauthorized' }),
      });

      await expect(generateInvoice('test')).rejects.toThrow('Unauthorized');
      expect(window.location.href).toBe('/login');
    });

    it('throws error with message from API on non-401 failure', async () => {
      localStorage.setItem('accessToken', 'token');
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'Bad request data' }),
      });

      await expect(generateInvoice('test')).rejects.toThrow('Bad request data');
    });
  });

  describe('listInvoices', () => {
    it('calls /invoices with query params', async () => {
      localStorage.setItem('accessToken', 'token');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            data: [],
            pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
            summary: { totalOutstanding: 0, paidThisMonth: 0, invoicesThisMonth: 0 },
          }),
      });

      await listInvoices({ page: 2, limit: 10, status: 'paid' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('page=2'),
        expect.any(Object)
      );
    });

    it('returns normalized data with invoices key', async () => {
      localStorage.setItem('accessToken', 'token');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            data: [{ id: '1', invoiceNumber: 'INV-001' }],
            pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
          }),
      });

      const result = await listInvoices();

      expect(result.invoices).toHaveLength(1);
      expect(result.invoices[0].id).toBe('1');
    });

    it('provides default summary when API omits it', async () => {
      localStorage.setItem('accessToken', 'token');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            data: [],
            pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
          }),
      });

      const result = await listInvoices();

      expect(result.summary).toEqual({
        totalOutstanding: 0,
        paidThisMonth: 0,
        invoicesThisMonth: 0,
      });
    });
  });

  describe('getInvoice', () => {
    it('fetches single invoice by id', async () => {
      localStorage.setItem('accessToken', 'token');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: 'abc', invoiceNumber: 'INV-001' }),
      });

      const result = await getInvoice('abc');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/invoices/abc'),
        expect.any(Object)
      );
      expect(result.id).toBe('abc');
    });
  });

  describe('updateInvoice', () => {
    it('sends PATCH request with update data', async () => {
      localStorage.setItem('accessToken', 'token');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: 'abc', status: 'sent' }),
      });

      await updateInvoice('abc', { status: 'sent' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/invoices/abc'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ status: 'sent' }),
        })
      );
    });
  });

  describe('deleteInvoice', () => {
    it('sends DELETE request', async () => {
      localStorage.setItem('accessToken', 'token');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });

      await deleteInvoice('abc');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/invoices/abc'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('sendInvoice', () => {
    it('sends POST to /invoices/:id/send', async () => {
      localStorage.setItem('accessToken', 'token');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({ status: 'sent', shareableLink: 'https://link.com' }),
      });

      const result = await sendInvoice('abc');

      expect(result.shareableLink).toBe('https://link.com');
    });
  });

  describe('listClients', () => {
    it('fetches clients with search query', async () => {
      localStorage.setItem('accessToken', 'token');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            data: [{ id: '1', name: 'Acme' }],
            pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
          }),
      });

      const result = await listClients({ search: 'acme' });

      expect(result.clients).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('search=acme'),
        expect.any(Object)
      );
    });
  });

  describe('getPublicInvoice', () => {
    it('fetches public invoice without auth header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            invoiceNumber: 'INV-001',
            total: 5000,
          }),
      });

      const result = await getPublicInvoice('share-token-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/invoices/public/share-token-123')
      );
      expect(result.invoiceNumber).toBe('INV-001');
    });

    it('throws error when public invoice not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Invoice not found' }),
      });

      await expect(getPublicInvoice('bad-token')).rejects.toThrow(
        'Invoice not found'
      );
    });
  });

  describe('getProfile', () => {
    it('fetches user profile', async () => {
      localStorage.setItem('accessToken', 'token');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            id: '1',
            email: 'test@test.com',
            name: 'Test User',
          }),
      });

      const result = await getProfile();

      expect(result.name).toBe('Test User');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/me'),
        expect.any(Object)
      );
    });
  });
});
