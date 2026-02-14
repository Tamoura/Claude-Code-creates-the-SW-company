import { Logger, redactSensitiveFields, LogData } from './logger';

describe('logger utilities', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('redactSensitiveFields', () => {
    it('should redact password fields', () => {
      const data = { username: 'alice', password: 's3cret' };
      const result = redactSensitiveFields(data);
      expect(result.username).toBe('alice');
      expect(result.password).toBe('[REDACTED]');
    });

    it('should redact secret fields', () => {
      const data = { webhookSecret: 'whsec_abc123', name: 'hook' };
      const result = redactSensitiveFields(data);
      expect(result.webhookSecret).toBe('[REDACTED]');
      expect(result.name).toBe('hook');
    });

    it('should redact token fields', () => {
      const data = { accessToken: 'bearer_xyz', refreshToken: 'ref_abc' };
      const result = redactSensitiveFields(data);
      expect(result.accessToken).toBe('[REDACTED]');
      expect(result.refreshToken).toBe('[REDACTED]');
    });

    it('should redact authorization fields', () => {
      const data = { authorization: 'Bearer abc', userId: 1 };
      const result = redactSensitiveFields(data);
      expect(result.authorization).toBe('[REDACTED]');
      expect(result.userId).toBe(1);
    });

    it('should redact apikey and api_key fields', () => {
      const data = { apikey: 'sk_live_123', api_key: 'sk_test_456' };
      const result = redactSensitiveFields(data);
      expect(result.apikey).toBe('[REDACTED]');
      expect(result.api_key).toBe('[REDACTED]');
    });

    it('should redact private_key and privatekey fields', () => {
      const data = { private_key: 'key123', privateKey: 'key456' };
      const result = redactSensitiveFields(data);
      expect(result.private_key).toBe('[REDACTED]');
      expect(result.privateKey).toBe('[REDACTED]');
    });

    it('should redact credit_card and creditcard fields', () => {
      const data = { credit_card: '4111111111111111', creditCard: '5500000000000004' };
      const result = redactSensitiveFields(data);
      expect(result.credit_card).toBe('[REDACTED]');
      expect(result.creditCard).toBe('[REDACTED]');
    });

    it('should redact ssn, cookie, encryption_key, hmac, mnemonic, seed_phrase fields', () => {
      const data = {
        ssn: '123-45-6789',
        cookie: 'session=abc',
        encryption_key: 'enc_key',
        hmac: 'hmac_value',
        mnemonic: 'word1 word2 word3',
        seed_phrase: 'seed words here',
      };
      const result = redactSensitiveFields(data);
      expect(result.ssn).toBe('[REDACTED]');
      expect(result.cookie).toBe('[REDACTED]');
      expect(result.encryption_key).toBe('[REDACTED]');
      expect(result.hmac).toBe('[REDACTED]');
      expect(result.mnemonic).toBe('[REDACTED]');
      expect(result.seed_phrase).toBe('[REDACTED]');
    });

    it('should be case-insensitive when matching sensitive fields', () => {
      const data = { PASSWORD: 'secret', ApiKey: 'key', SECRET_TOKEN: 'tok' };
      const result = redactSensitiveFields(data);
      expect(result.PASSWORD).toBe('[REDACTED]');
      expect(result.ApiKey).toBe('[REDACTED]');
      expect(result.SECRET_TOKEN).toBe('[REDACTED]');
    });

    it('should redact fields that contain sensitive patterns as substrings', () => {
      const data = {
        userPassword: 'abc',
        mySecretValue: 'def',
        x_authorization_header: 'ghi',
      };
      const result = redactSensitiveFields(data);
      expect(result.userPassword).toBe('[REDACTED]');
      expect(result.mySecretValue).toBe('[REDACTED]');
      expect(result.x_authorization_header).toBe('[REDACTED]');
    });

    it('should recursively redact nested objects', () => {
      const data = {
        user: {
          name: 'Alice',
          credentials: {
            password: 'secret',
            apiKey: 'key123',
          },
        },
        requestId: 'req_001',
      };
      const result = redactSensitiveFields(data);
      expect(result.requestId).toBe('req_001');
      const user = result.user as LogData;
      expect(user.name).toBe('Alice');
      const credentials = user.credentials as LogData;
      expect(credentials.password).toBe('[REDACTED]');
      expect(credentials.apiKey).toBe('[REDACTED]');
    });

    it('should not redact array values (arrays are passed through)', () => {
      const data = { tags: ['admin', 'user'], password: 'secret' };
      const result = redactSensitiveFields(data);
      expect(result.tags).toEqual(['admin', 'user']);
      expect(result.password).toBe('[REDACTED]');
    });

    it('should handle null values without crashing', () => {
      const data = { value: null, password: 'secret' };
      const result = redactSensitiveFields(data as LogData);
      expect(result.value).toBeNull();
      expect(result.password).toBe('[REDACTED]');
    });

    it('should pass through non-sensitive primitive values unchanged', () => {
      const data = { count: 42, active: true, name: 'test', rate: 3.14 };
      const result = redactSensitiveFields(data);
      expect(result).toEqual(data);
    });

    it('should return a new object (not mutate the input)', () => {
      const data = { password: 'secret', name: 'test' };
      const result = redactSensitiveFields(data);
      expect(data.password).toBe('secret'); // original unchanged
      expect(result.password).toBe('[REDACTED]');
      expect(result).not.toBe(data);
    });
  });

  describe('Logger', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
      delete process.env.NODE_ENV;
      delete process.env.LOG_LEVEL;
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    describe('info', () => {
      it('should log an info message', () => {
        const logger = new Logger();
        logger.info('Server started');

        expect(consoleSpy).toHaveBeenCalledTimes(1);
        const call = consoleSpy.mock.calls[0];
        expect(call[0]).toContain('INFO');
        expect(call[0]).toContain('Server started');
      });

      it('should log info message with data', () => {
        const logger = new Logger();
        logger.info('Request received', { method: 'GET', path: '/api/health' });

        expect(consoleSpy).toHaveBeenCalledTimes(1);
        const call = consoleSpy.mock.calls[0];
        expect(call[0]).toContain('INFO');
        expect(call[0]).toContain('Request received');
        expect(call[1]).toEqual({ method: 'GET', path: '/api/health' });
      });

      it('should redact sensitive data in info logs', () => {
        const logger = new Logger();
        logger.info('User login', { username: 'alice', password: 's3cret' });

        const call = consoleSpy.mock.calls[0];
        expect(call[1]).toEqual({ username: 'alice', password: '[REDACTED]' });
      });
    });

    describe('warn', () => {
      it('should log a warn message', () => {
        const logger = new Logger();
        logger.warn('Deprecation notice');

        expect(consoleSpy).toHaveBeenCalledTimes(1);
        const call = consoleSpy.mock.calls[0];
        expect(call[0]).toContain('WARN');
        expect(call[0]).toContain('Deprecation notice');
      });

      it('should log warn message with data', () => {
        const logger = new Logger();
        logger.warn('Rate limit approaching', { remaining: 10 });

        const call = consoleSpy.mock.calls[0];
        expect(call[0]).toContain('WARN');
        expect(call[1]).toEqual({ remaining: 10 });
      });
    });

    describe('error', () => {
      it('should log an error message with an Error object', () => {
        const logger = new Logger();
        const err = new Error('Connection failed');
        logger.error('Database error', err);

        expect(consoleSpy).toHaveBeenCalledTimes(1);
        const call = consoleSpy.mock.calls[0];
        expect(call[0]).toContain('ERROR');
        expect(call[0]).toContain('Database error');
        const loggedData = call[1];
        expect(loggedData.error).toEqual({
          name: 'Connection failed' ? 'Error' : '',
          message: 'Connection failed',
          stack: expect.any(String),
        });
      });

      it('should extract name, message, and stack from Error objects', () => {
        const logger = new Logger();
        const err = new TypeError('Invalid argument');
        logger.error('Validation failed', err);

        const loggedData = consoleSpy.mock.calls[0][1];
        expect(loggedData.error.name).toBe('TypeError');
        expect(loggedData.error.message).toBe('Invalid argument');
        expect(loggedData.error.stack).toBeDefined();
      });

      it('should pass non-Error objects through as-is', () => {
        const logger = new Logger();
        logger.error('Unknown error', 'string-error');

        const loggedData = consoleSpy.mock.calls[0][1];
        expect(loggedData.error).toBe('string-error');
      });

      it('should handle null error value', () => {
        const logger = new Logger();
        logger.error('Null error', null);

        const loggedData = consoleSpy.mock.calls[0][1];
        expect(loggedData.error).toBeNull();
      });

      it('should merge additional data with error data', () => {
        const logger = new Logger();
        const err = new Error('Timeout');
        logger.error('Request failed', err, { requestId: 'req_123', path: '/api/data' });

        const loggedData = consoleSpy.mock.calls[0][1];
        expect(loggedData.requestId).toBe('req_123');
        expect(loggedData.path).toBe('/api/data');
        expect(loggedData.error).toBeDefined();
        expect(loggedData.error.message).toBe('Timeout');
      });

      it('should redact sensitive fields in error additional data', () => {
        const logger = new Logger();
        const err = new Error('Auth failure');
        logger.error('Login error', err, { token: 'bearer_abc' });

        const loggedData = consoleSpy.mock.calls[0][1];
        expect(loggedData.token).toBe('[REDACTED]');
      });
    });

    describe('debug', () => {
      it('should log when log level is debug', () => {
        const logger = new Logger('debug');
        logger.debug('Detailed trace', { query: 'SELECT 1' });

        expect(consoleSpy).toHaveBeenCalledTimes(1);
        const call = consoleSpy.mock.calls[0];
        expect(call[0]).toContain('DEBUG');
        expect(call[0]).toContain('Detailed trace');
        expect(call[1]).toEqual({ query: 'SELECT 1' });
      });

      it('should NOT log when log level is info', () => {
        const logger = new Logger('info');
        logger.debug('Should not appear');

        expect(consoleSpy).not.toHaveBeenCalled();
      });

      it('should NOT log when log level is warn', () => {
        const logger = new Logger('warn');
        logger.debug('Should not appear');

        expect(consoleSpy).not.toHaveBeenCalled();
      });

      it('should NOT log when log level is error', () => {
        const logger = new Logger('error');
        logger.debug('Should not appear');

        expect(consoleSpy).not.toHaveBeenCalled();
      });

      it('should respect LOG_LEVEL env var for debug', () => {
        process.env.LOG_LEVEL = 'debug';
        const logger = new Logger();
        logger.debug('Env debug');

        expect(consoleSpy).toHaveBeenCalledTimes(1);
        expect(consoleSpy.mock.calls[0][0]).toContain('DEBUG');
      });

      it('should default to info level when no level is specified', () => {
        const logger = new Logger();
        logger.debug('Should not appear');

        expect(consoleSpy).not.toHaveBeenCalled();
      });
    });

    describe('production output format', () => {
      it('should output JSON in production mode', () => {
        process.env.NODE_ENV = 'production';
        const logger = new Logger();
        logger.info('Prod message', { key: 'value' });

        expect(consoleSpy).toHaveBeenCalledTimes(1);
        const output = consoleSpy.mock.calls[0][0];
        const parsed = JSON.parse(output);
        expect(parsed.level).toBe('info');
        expect(parsed.message).toBe('Prod message');
        expect(parsed.key).toBe('value');
        expect(parsed.timestamp).toBeDefined();
      });

      it('should include timestamp in JSON production output', () => {
        process.env.NODE_ENV = 'production';
        const logger = new Logger();
        logger.warn('Prod warning');

        const parsed = JSON.parse(consoleSpy.mock.calls[0][0]);
        expect(parsed.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      });

      it('should redact sensitive fields in production JSON output', () => {
        process.env.NODE_ENV = 'production';
        const logger = new Logger();
        logger.info('Auth event', { userId: 1, password: 'secret123' });

        const parsed = JSON.parse(consoleSpy.mock.calls[0][0]);
        expect(parsed.userId).toBe(1);
        expect(parsed.password).toBe('[REDACTED]');
      });
    });

    describe('development output format', () => {
      it('should use human-readable format in non-production mode', () => {
        process.env.NODE_ENV = 'development';
        const logger = new Logger();
        logger.info('Dev message');

        const call = consoleSpy.mock.calls[0];
        // Format: [timestamp] LEVEL: message
        expect(call[0]).toMatch(/^\[.+\] INFO: Dev message$/);
      });

      it('should pass data as second argument in development mode', () => {
        process.env.NODE_ENV = 'development';
        const logger = new Logger();
        logger.info('With data', { foo: 'bar' });

        expect(consoleSpy.mock.calls[0][1]).toEqual({ foo: 'bar' });
      });

      it('should pass empty string when no data is provided in dev mode', () => {
        process.env.NODE_ENV = 'development';
        const logger = new Logger();
        logger.info('No data');

        expect(consoleSpy.mock.calls[0][1]).toBe('');
      });
    });

    describe('exported logger instance', () => {
      it('should export a default logger instance', async () => {
        // Dynamic import to get the module export
        const mod = await import('./logger');
        expect(mod.logger).toBeDefined();
        expect(mod.logger).toBeInstanceOf(Logger);
      });
    });
  });
});
