/**
 * Tests that the API client integrates Zod validation
 * for critical response types.
 */

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock TokenManager
jest.mock('../../src/lib/token-manager', () => ({
  TokenManager: {
    getToken: jest.fn(() => 'test-token'),
    setToken: jest.fn(),
    clearToken: jest.fn(),
    hasToken: jest.fn(() => true),
  },
}));

// Import after mocks are set up
import { apiClient } from '../../src/lib/api-client';

describe('API Client Validation Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDashboard', () => {
    it('logs a warning when dashboard response has unexpected shape', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const invalidDashboard = {
        childId: 'child-1',
        // missing childName, overallScore, dimensions, calculatedAt
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(invalidDashboard),
      });

      const result = await apiClient.getDashboard('child-1');

      // Should still return the data (graceful degradation)
      expect(result).toEqual(invalidDashboard);

      // Should have logged a validation warning
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[API Validation]'),
        expect.anything()
      );

      warnSpy.mockRestore();
    });

    it('returns validated data when shape is correct', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const validDashboard = {
        childId: 'child-1',
        childName: 'Sarah',
        ageBand: '3-4',
        overallScore: 75.5,
        dimensions: [],
        calculatedAt: '2024-01-01T00:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(validDashboard),
      });

      const result = await apiClient.getDashboard('child-1');

      expect(result).toEqual(validDashboard);
      expect(warnSpy).not.toHaveBeenCalled();

      warnSpy.mockRestore();
    });
  });

  describe('getChild', () => {
    it('logs a warning when child response has unexpected shape', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const invalidChild = {
        id: 123, // should be string
        name: 'Sarah',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(invalidChild),
      });

      const result = await apiClient.getChild('child-1');

      expect(result).toEqual(invalidChild);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[API Validation]'),
        expect.anything()
      );

      warnSpy.mockRestore();
    });
  });

  describe('getObservations', () => {
    it('validates observation items in paginated response', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const validResponse = {
        data: [
          {
            id: 'obs-1',
            childId: 'child-1',
            dimension: 'academic',
            content: 'Great progress',
            sentiment: 'positive',
            observedAt: '2024-01-15T10:00:00Z',
            tags: ['reading'],
            createdAt: '2024-01-15T10:00:00Z',
            updatedAt: '2024-01-15T10:00:00Z',
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
          hasMore: false,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(validResponse),
      });

      const result = await apiClient.getObservations('child-1');

      expect(result).toEqual(validResponse);
      expect(warnSpy).not.toHaveBeenCalled();

      warnSpy.mockRestore();
    });
  });
});
