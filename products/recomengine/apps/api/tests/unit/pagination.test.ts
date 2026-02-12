import { describe, it, expect } from '@jest/globals';
import { parsePagination, paginatedResult } from '../../src/utils/pagination';

describe('Pagination', () => {
  describe('parsePagination', () => {
    it('should parse valid limit and offset', () => {
      const result = parsePagination({ limit: '10', offset: '20' });
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(20);
    });

    it('should use defaults when not provided', () => {
      const result = parsePagination({});
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    it('should clamp limit to max 100', () => {
      const result = parsePagination({ limit: '500' });
      expect(result.limit).toBe(100);
    });

    it('should use default when limit is 0 (falsy)', () => {
      const result = parsePagination({ limit: '0' });
      expect(result.limit).toBe(20); // 0 is falsy, so falls back to default 20
    });

    it('should clamp negative limit to min 1', () => {
      const result = parsePagination({ limit: '-5' });
      expect(result.limit).toBe(1);
    });

    it('should handle negative offset', () => {
      const result = parsePagination({ offset: '-5' });
      expect(result.offset).toBe(0);
    });
  });

  describe('paginatedResult', () => {
    it('should correctly compute hasMore', () => {
      const result = paginatedResult(['a', 'b'], 10, { limit: 2, offset: 0 });
      expect(result.meta.pagination.hasMore).toBe(true);
    });

    it('should return hasMore=false when at end', () => {
      const result = paginatedResult(['a', 'b'], 10, { limit: 2, offset: 8 });
      expect(result.meta.pagination.hasMore).toBe(false);
    });

    it('should include correct metadata', () => {
      const result = paginatedResult(['x'], 42, { limit: 20, offset: 0 });
      expect(result.meta.pagination.total).toBe(42);
      expect(result.meta.pagination.limit).toBe(20);
      expect(result.meta.pagination.offset).toBe(0);
    });
  });
});
