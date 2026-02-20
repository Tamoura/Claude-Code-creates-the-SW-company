/**
 * Environment Variable Validation
 *
 * Validates required environment variables on application startup
 * to fail fast and provide clear error messages.
 *
 * Required: DATABASE_URL, JWT_SECRET
 * Optional (warn if missing): REDIS_URL, API_KEY_HMAC_SECRET
 */

import { logger } from './logger.js';

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function validateDatabase(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!process.env.DATABASE_URL) {
    errors.push('DATABASE_URL environment variable is required');
  }

  return { valid: errors.length === 0, errors, warnings };
}

function validateJWT(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    errors.push('JWT_SECRET environment variable is required');
  } else if (jwtSecret.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters long');
    errors.push('Generate a strong secret: openssl rand -hex 64');
  } else if (jwtSecret.length < 64) {
    warnings.push('JWT_SECRET should be at least 64 characters for optimal security');
  }

  return { valid: errors.length === 0, errors, warnings };
}

function validateRedis(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!process.env.REDIS_URL) {
    warnings.push('REDIS_URL not set - Redis features disabled (rate limiting uses in-memory store)');
  }

  return { valid: errors.length === 0, errors, warnings };
}

function validateApiKeyHmac(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const hmacSecret = process.env.API_KEY_HMAC_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!hmacSecret) {
    if (isProduction) {
      errors.push('API_KEY_HMAC_SECRET is required in production');
      errors.push('Generate a secret: openssl rand -hex 64');
    } else {
      warnings.push('API_KEY_HMAC_SECRET not set - using SHA-256 fallback (dev/test only)');
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate all environment variables.
 * Throws on validation failure to prevent startup with bad config.
 */
export function validateEnvironment(): void {
  logger.info('Validating environment configuration...');

  const validations = [
    { name: 'Database Configuration', result: validateDatabase() },
    { name: 'JWT Configuration', result: validateJWT() },
    { name: 'Redis Configuration', result: validateRedis() },
    { name: 'API Key HMAC', result: validateApiKeyHmac() },
  ];

  let hasErrors = false;
  let hasWarnings = false;

  for (const { name, result } of validations) {
    if (result.errors.length > 0) {
      hasErrors = true;
      logger.error(`${name} validation failed:`);
      result.errors.forEach((error) => logger.error(`   - ${error}`));
    }

    if (result.warnings.length > 0) {
      hasWarnings = true;
      logger.warn(`${name} warnings:`);
      result.warnings.forEach((warning) => logger.warn(`   - ${warning}`));
    }
  }

  if (hasErrors) {
    logger.error('Environment validation failed - server cannot start');
    throw new Error('Environment validation failed - see errors above');
  }

  if (hasWarnings) {
    logger.warn('Environment validation completed with warnings');
  } else {
    logger.info('Environment validation successful');
  }
}
