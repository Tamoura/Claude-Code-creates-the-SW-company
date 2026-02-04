/**
 * Test setup - configure environment variables for testing.
 * Tests use a real database (test DB) where possible,
 * but provider API calls are always mocked.
 */

// Set test environment variables before anything else loads
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-not-for-production';
process.env.PROVIDER_KEY_ENCRYPTION_KEY = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';
process.env.LOG_LEVEL = 'error';
