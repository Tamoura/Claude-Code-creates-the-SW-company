/**
 * Redis Configuration Tests
 *
 * Tests for Redis TLS and authentication configuration options.
 * These tests verify that Redis connections are properly configured
 * based on environment variables for different deployment scenarios.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { getRedisOptions } from '../../src/plugins/redis.js';

describe('Redis Plugin Configuration', () => {
  // Store original env vars
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset relevant env vars
    delete process.env.REDIS_URL;
    delete process.env.REDIS_TLS;
    delete process.env.REDIS_TLS_REJECT_UNAUTHORIZED;
    delete process.env.REDIS_PASSWORD;
  });

  afterEach(() => {
    // Restore original env
    process.env = { ...originalEnv };
  });

  describe('TLS Configuration', () => {
    it('should enable TLS when REDIS_TLS=true', () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      process.env.REDIS_TLS = 'true';

      const options = getRedisOptions();

      expect(options.tls).toBeDefined();
      expect(options.tls).toEqual({
        rejectUnauthorized: true,
      });
    });

    it('should disable TLS when REDIS_TLS is not set', () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      const options = getRedisOptions();

      expect(options.tls).toBeUndefined();
    });

    it('should disable TLS when REDIS_TLS=false', () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      process.env.REDIS_TLS = 'false';

      const options = getRedisOptions();

      expect(options.tls).toBeUndefined();
    });

    it('should allow self-signed certs when REDIS_TLS_REJECT_UNAUTHORIZED=false', () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      process.env.REDIS_TLS = 'true';
      process.env.REDIS_TLS_REJECT_UNAUTHORIZED = 'false';

      const options = getRedisOptions();

      expect(options.tls).toBeDefined();
      expect(options.tls).toEqual({
        rejectUnauthorized: false,
      });
    });

    it('should require valid certs by default with TLS enabled', () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      process.env.REDIS_TLS = 'true';

      const options = getRedisOptions();

      expect(options.tls?.rejectUnauthorized).toBe(true);
    });
  });

  describe('Password Authentication', () => {
    it('should use REDIS_PASSWORD when set', () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      process.env.REDIS_PASSWORD = 'my-secure-password';

      const options = getRedisOptions();

      expect(options.password).toBe('my-secure-password');
    });

    it('should not set password when REDIS_PASSWORD is not set', () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      const options = getRedisOptions();

      expect(options.password).toBeUndefined();
    });

    it('should set env password even if password in REDIS_URL (ioredis handles precedence)', () => {
      // When password is in URL, ioredis will use URL password as precedence
      // But we still set the env var password in options
      process.env.REDIS_URL = 'redis://:url-password@localhost:6379';
      process.env.REDIS_PASSWORD = 'env-password';

      const options = getRedisOptions();

      // The env var password is set in options
      expect(options.password).toBe('env-password');
    });
  });

  describe('Connection Options', () => {
    it('should include maxRetriesPerRequest configuration', () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      const options = getRedisOptions();

      expect(options.maxRetriesPerRequest).toBeDefined();
      expect(options.maxRetriesPerRequest).toBe(3);
    });

    it('should include retry strategy function', () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      const options = getRedisOptions();

      expect(options.retryStrategy).toBeDefined();
      expect(typeof options.retryStrategy).toBe('function');
    });

    it('should have retry strategy with exponential backoff capped at 2000ms', () => {
      const options = getRedisOptions();
      const retryStrategy = options.retryStrategy as (times: number) => number;

      // First retry: min(1 * 50, 2000) = 50
      expect(retryStrategy(1)).toBe(50);
      // Second retry: min(2 * 50, 2000) = 100
      expect(retryStrategy(2)).toBe(100);
      // 100th retry: min(100 * 50, 2000) = 2000 (capped)
      expect(retryStrategy(100)).toBe(2000);
    });

    it('should include reconnectOnError handler', () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      const options = getRedisOptions();

      expect(options.reconnectOnError).toBeDefined();
      expect(typeof options.reconnectOnError).toBe('function');
    });

    it('should return true from reconnectOnError to enable reconnection', () => {
      const options = getRedisOptions();
      const reconnectOnError = options.reconnectOnError as (err: Error) => boolean;

      const result = reconnectOnError(new Error('Test error'));
      expect(result).toBe(true);
    });
  });

  describe('Combined Configuration Scenarios', () => {
    it('should handle cloud Redis with TLS and password', () => {
      process.env.REDIS_URL = 'redis://my-redis-host.cloud.example.com:6380';
      process.env.REDIS_TLS = 'true';
      process.env.REDIS_PASSWORD = 'cloud-password';

      const options = getRedisOptions();

      expect(options.tls).toEqual({ rejectUnauthorized: true });
      expect(options.password).toBe('cloud-password');
      expect(options.maxRetriesPerRequest).toBe(3);
    });

    it('should handle local Redis without TLS or password', () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      const options = getRedisOptions();

      expect(options.tls).toBeUndefined();
      expect(options.password).toBeUndefined();
      expect(options.maxRetriesPerRequest).toBe(3);
    });

    it('should handle development Redis with password but no TLS', () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      process.env.REDIS_PASSWORD = 'dev-password';

      const options = getRedisOptions();

      expect(options.tls).toBeUndefined();
      expect(options.password).toBe('dev-password');
    });

    it('should handle staging with TLS but self-signed certs', () => {
      process.env.REDIS_URL = 'redis://staging-redis.internal:6379';
      process.env.REDIS_TLS = 'true';
      process.env.REDIS_TLS_REJECT_UNAUTHORIZED = 'false';
      process.env.REDIS_PASSWORD = 'staging-password';

      const options = getRedisOptions();

      expect(options.tls).toEqual({ rejectUnauthorized: false });
      expect(options.password).toBe('staging-password');
    });
  });
});
