import { describe, it, expect } from 'vitest';
import {
  StablecoinGatewayError,
  ApiError,
  WebhookSignatureError,
  TimeoutError,
  ConfigurationError,
} from './errors';

describe('Error classes', () => {
  describe('StablecoinGatewayError', () => {
    it('should be instanceof Error', () => {
      const error = new StablecoinGatewayError('Test error');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(StablecoinGatewayError);
    });

    it('should have correct name', () => {
      const error = new StablecoinGatewayError('Test error');
      expect(error.name).toBe('StablecoinGatewayError');
    });

    it('should have correct message', () => {
      const error = new StablecoinGatewayError('Custom message');
      expect(error.message).toBe('Custom message');
    });
  });

  describe('ApiError', () => {
    it('should have all properties', () => {
      const error = new ApiError('Not found', 404, 'NOT_FOUND', {
        resource: 'payment',
      });

      expect(error.message).toBe('Not found');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.details).toEqual({ resource: 'payment' });
    });

    it('should be instanceof StablecoinGatewayError', () => {
      const error = new ApiError('Error', 500, 'SERVER_ERROR');
      expect(error).toBeInstanceOf(StablecoinGatewayError);
      expect(error).toBeInstanceOf(ApiError);
    });

    it('should have correct name', () => {
      const error = new ApiError('Error', 500, 'SERVER_ERROR');
      expect(error.name).toBe('ApiError');
    });

    describe('status check methods', () => {
      it('isValidationError should return true for 400', () => {
        const error = new ApiError('Bad request', 400, 'VALIDATION_ERROR');
        expect(error.isValidationError()).toBe(true);
        expect(error.isAuthenticationError()).toBe(false);
      });

      it('isAuthenticationError should return true for 401', () => {
        const error = new ApiError('Unauthorized', 401, 'UNAUTHORIZED');
        expect(error.isAuthenticationError()).toBe(true);
        expect(error.isValidationError()).toBe(false);
      });

      it('isPermissionError should return true for 403', () => {
        const error = new ApiError('Forbidden', 403, 'FORBIDDEN');
        expect(error.isPermissionError()).toBe(true);
        expect(error.isNotFoundError()).toBe(false);
      });

      it('isNotFoundError should return true for 404', () => {
        const error = new ApiError('Not found', 404, 'NOT_FOUND');
        expect(error.isNotFoundError()).toBe(true);
        expect(error.isServerError()).toBe(false);
      });

      it('isRateLimitError should return true for 429', () => {
        const error = new ApiError('Too many requests', 429, 'RATE_LIMIT');
        expect(error.isRateLimitError()).toBe(true);
        expect(error.isServerError()).toBe(false);
      });

      it('isServerError should return true for 5xx', () => {
        expect(
          new ApiError('Server error', 500, 'SERVER_ERROR').isServerError()
        ).toBe(true);
        expect(
          new ApiError('Bad gateway', 502, 'BAD_GATEWAY').isServerError()
        ).toBe(true);
        expect(
          new ApiError('Unavailable', 503, 'UNAVAILABLE').isServerError()
        ).toBe(true);
        expect(
          new ApiError('Timeout', 504, 'GATEWAY_TIMEOUT').isServerError()
        ).toBe(true);
        expect(
          new ApiError('Not found', 404, 'NOT_FOUND').isServerError()
        ).toBe(false);
      });
    });
  });

  describe('WebhookSignatureError', () => {
    it('should have default message', () => {
      const error = new WebhookSignatureError();
      expect(error.message).toBe('Invalid webhook signature');
    });

    it('should accept custom message', () => {
      const error = new WebhookSignatureError('Custom signature error');
      expect(error.message).toBe('Custom signature error');
    });

    it('should be instanceof StablecoinGatewayError', () => {
      const error = new WebhookSignatureError();
      expect(error).toBeInstanceOf(StablecoinGatewayError);
    });

    it('should have correct name', () => {
      const error = new WebhookSignatureError();
      expect(error.name).toBe('WebhookSignatureError');
    });
  });

  describe('TimeoutError', () => {
    it('should have timeout value', () => {
      const error = new TimeoutError(30000);
      expect(error.timeout).toBe(30000);
    });

    it('should have formatted message', () => {
      const error = new TimeoutError(5000);
      expect(error.message).toBe('Request timed out after 5000ms');
    });

    it('should be instanceof StablecoinGatewayError', () => {
      const error = new TimeoutError(1000);
      expect(error).toBeInstanceOf(StablecoinGatewayError);
    });

    it('should have correct name', () => {
      const error = new TimeoutError(1000);
      expect(error.name).toBe('TimeoutError');
    });
  });

  describe('ConfigurationError', () => {
    it('should have message', () => {
      const error = new ConfigurationError('API key is required');
      expect(error.message).toBe('API key is required');
    });

    it('should be instanceof StablecoinGatewayError', () => {
      const error = new ConfigurationError('Config error');
      expect(error).toBeInstanceOf(StablecoinGatewayError);
    });

    it('should have correct name', () => {
      const error = new ConfigurationError('Config error');
      expect(error.name).toBe('ConfigurationError');
    });
  });
});
