/**
 * Environment variable validation
 *
 * Validates required environment variables on application startup
 * to fail fast and provide clear error messages.
 */

import { logger } from './logger.js';

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const MIN_ENTROPY_THRESHOLD = 3.0;
const MIN_UNIQUE_CHARS = 16;

/**
 * Calculate Shannon entropy of a string (bits per character).
 *
 * Shannon entropy measures the average information content per character.
 * A truly random hex string yields ~4.0 bits/char. A single repeated
 * character yields 0. The threshold of 3.0 rejects trivially guessable
 * secrets while allowing any reasonably generated key.
 */
export function calculateShannonEntropy(str: string): number {
  if (str.length === 0) {
    return 0;
  }

  const freq: Record<string, number> = {};
  for (const char of str) {
    freq[char] = (freq[char] || 0) + 1;
  }

  const len = str.length;
  let entropy = 0;
  for (const count of Object.values(freq)) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }

  return entropy;
}

/**
 * Validate KMS configuration
 */
function validateKMS(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if KMS is configured
  const kmsKeyId = process.env.KMS_KEY_ID || process.env.AWS_KMS_KEY_ID;
  const privateKey = process.env.HOT_WALLET_PRIVATE_KEY;
  const allowFallback = process.env.ALLOW_PRIVATE_KEY_FALLBACK === 'true';

  if (!kmsKeyId && !privateKey) {
    errors.push(
      'KMS_KEY_ID or AWS_KMS_KEY_ID environment variable is required for secure wallet management'
    );
    errors.push(
      'Alternative: Set HOT_WALLET_PRIVATE_KEY (development only) with ALLOW_PRIVATE_KEY_FALLBACK=true'
    );
  }

  if (privateKey) {
    if (!allowFallback) {
      errors.push(
        'HOT_WALLET_PRIVATE_KEY is set but ALLOW_PRIVATE_KEY_FALLBACK is not enabled'
      );
      errors.push(
        'For development: Set ALLOW_PRIVATE_KEY_FALLBACK=true (NOT for production)'
      );
    }

    if (process.env.NODE_ENV === 'production') {
      errors.push(
        'HOT_WALLET_PRIVATE_KEY detected in production environment - use KMS instead'
      );
      errors.push('Set KMS_KEY_ID and remove HOT_WALLET_PRIVATE_KEY');
    } else {
      warnings.push(
        'Using HOT_WALLET_PRIVATE_KEY fallback - not recommended for production'
      );
    }
  }

  if (kmsKeyId) {
    // Validate KMS key format
    const isArn = kmsKeyId.startsWith('arn:aws:kms:');
    const isKeyId =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(kmsKeyId);
    const isAlias = kmsKeyId.startsWith('alias/');

    if (!isArn && !isKeyId && !isAlias) {
      errors.push(
        `Invalid KMS_KEY_ID format: ${kmsKeyId}. Must be ARN, Key ID (UUID), or alias`
      );
    }

    // Check AWS region
    if (!process.env.AWS_REGION) {
      warnings.push('AWS_REGION not set - will use default region (us-east-1)');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate JWT configuration
 */
function validateJWT(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    errors.push('JWT_SECRET environment variable is required');
  } else if (jwtSecret === 'your-jwt-secret-change-in-production' ||
             jwtSecret === 'change-this-secret-in-production' ||
             jwtSecret === 'your-secret-key-change-in-production') {
    errors.push('JWT_SECRET must not be the default value');
    errors.push(
      'Generate a strong secret: openssl rand -hex 64'
    );
  } else if (jwtSecret.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters long');
    errors.push(
      'Generate a strong secret: openssl rand -hex 64'
    );
  } else {
    if (jwtSecret.length < 64) {
      warnings.push('JWT_SECRET should be at least 64 characters for optimal security');
    }

    // Entropy validation
    const isProduction = process.env.NODE_ENV === 'production';
    const entropy = calculateShannonEntropy(jwtSecret);
    const uniqueChars = new Set(jwtSecret).size;

    if (entropy < MIN_ENTROPY_THRESHOLD) {
      const msg = `JWT_SECRET has low Shannon entropy (${entropy.toFixed(2)} bits/char, minimum ${MIN_ENTROPY_THRESHOLD.toFixed(1)} required)`;
      if (isProduction) {
        errors.push(msg);
        errors.push('Generate a strong secret: openssl rand -hex 64');
      } else {
        warnings.push(msg);
        warnings.push('This would be rejected in production');
      }
    }

    if (uniqueChars < MIN_UNIQUE_CHARS) {
      const msg = `JWT_SECRET has too few unique characters (${uniqueChars}, minimum ${MIN_UNIQUE_CHARS} required)`;
      if (isProduction) {
        errors.push(msg);
        errors.push('Generate a strong secret: openssl rand -hex 64');
      } else {
        warnings.push(msg);
        warnings.push('This would be rejected in production');
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate database configuration
 */
function validateDatabase(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!process.env.DATABASE_URL) {
    errors.push('DATABASE_URL environment variable is required');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate Redis configuration
 */
function validateRedis(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!process.env.REDIS_URL) {
    warnings.push('REDIS_URL not set - some features may not work correctly');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate blockchain configuration
 */
function validateBlockchain(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const hasAlchemy = !!process.env.ALCHEMY_API_KEY;
  const hasInfura = !!process.env.INFURA_PROJECT_ID;
  const hasQuicknode = !!process.env.QUICKNODE_ENDPOINT;

  if (!hasAlchemy && !hasInfura && !hasQuicknode) {
    warnings.push(
      'No blockchain RPC provider configured (ALCHEMY_API_KEY, INFURA_PROJECT_ID, or QUICKNODE_ENDPOINT)'
    );
    warnings.push('Blockchain monitoring features will not work');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate webhook encryption configuration
 */
function validateWebhookEncryption(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const encryptionKey = process.env.WEBHOOK_ENCRYPTION_KEY;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!encryptionKey) {
    if (isProduction) {
      errors.push('WEBHOOK_ENCRYPTION_KEY is required in production');
      errors.push('Webhook secrets must be encrypted at rest in production environments');
      errors.push('Generate a key: openssl rand -hex 32');
    } else {
      warnings.push('WEBHOOK_ENCRYPTION_KEY not set - webhook secrets will be stored in plaintext');
      warnings.push('This is acceptable for development, but NOT for production');
      warnings.push('Generate a key: openssl rand -hex 32');
    }
  } else {
    // Validate key length (should be 32 bytes = 64 hex chars for AES-256)
    if (encryptionKey.length !== 64) {
      errors.push(`WEBHOOK_ENCRYPTION_KEY must be 64 hex characters (32 bytes) for AES-256`);
      errors.push(`Current length: ${encryptionKey.length} characters`);
      errors.push('Generate a valid key: openssl rand -hex 32');
    }

    // Validate key is hexadecimal
    if (!/^[0-9a-fA-F]+$/.test(encryptionKey)) {
      errors.push('WEBHOOK_ENCRYPTION_KEY must be a hexadecimal string');
      errors.push('Generate a valid key: openssl rand -hex 32');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate API key HMAC secret configuration
 */
function validateApiKeyHmac(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const hmacSecret = process.env.API_KEY_HMAC_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!hmacSecret) {
    if (isProduction) {
      errors.push('API_KEY_HMAC_SECRET is required in production');
      errors.push('API key hashing without HMAC is vulnerable to rainbow table attacks');
      errors.push('Generate a secret: openssl rand -hex 64');
    }
  } else if (hmacSecret.length < 32) {
    warnings.push(`API_KEY_HMAC_SECRET is short (${hmacSecret.length} chars) - recommend at least 32 characters`);
    warnings.push('Generate a strong secret: openssl rand -hex 64');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate internal API key configuration
 */
function validateInternalApiKey(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const internalKey = process.env.INTERNAL_API_KEY;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!internalKey) {
    if (isProduction) {
      errors.push('INTERNAL_API_KEY is required in production for metrics and internal endpoints');
    } else {
      warnings.push('INTERNAL_API_KEY not set - internal endpoints (metrics) will be unavailable');
    }
  } else if (internalKey.length < 32) {
    warnings.push(`INTERNAL_API_KEY is short (${internalKey.length} chars) - recommend at least 32 characters`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate all environment variables
 */
export function validateEnvironment(): void {
  logger.info('Validating environment configuration...');

  const validations = [
    { name: 'KMS Configuration', result: validateKMS() },
    { name: 'JWT Configuration', result: validateJWT() },
    { name: 'Database Configuration', result: validateDatabase() },
    { name: 'Redis Configuration', result: validateRedis() },
    { name: 'Blockchain Configuration', result: validateBlockchain() },
    { name: 'Webhook Encryption', result: validateWebhookEncryption() },
    { name: 'API Key HMAC', result: validateApiKeyHmac() },
    { name: 'Internal API Key', result: validateInternalApiKey() },
  ];

  let hasErrors = false;
  let hasWarnings = false;

  for (const { name, result } of validations) {
    if (result.errors.length > 0) {
      hasErrors = true;
      logger.error(`❌ ${name} validation failed:`);
      result.errors.forEach((error) => logger.error(`   - ${error}`));
    }

    if (result.warnings.length > 0) {
      hasWarnings = true;
      logger.warn(`⚠️  ${name} warnings:`);
      result.warnings.forEach((warning) => logger.warn(`   - ${warning}`));
    }
  }

  if (hasErrors) {
    logger.error('');
    logger.error('❌ Environment validation failed - server cannot start');
    logger.error('   Fix the errors above and restart the server');
    logger.error('');
    process.exit(1);
  }

  if (hasWarnings) {
    logger.warn('');
    logger.warn('⚠️  Environment validation completed with warnings');
    logger.warn('   Review warnings above - some features may not work correctly');
    logger.warn('');
  } else {
    logger.info('✅ Environment validation successful');
  }
}
