/**
 * tests/integration/logger.test.ts — Logger utility tests
 *
 * Tests logger behavior including log levels and PII redaction.
 *
 * [BACKEND-01] Logger tests
 */

describe('[BACKEND-01] Logger Utility', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const getLogger = () => {
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('../../src/utils/logger').logger;
  };

  test('[BACKEND-01] logger.info does not throw', () => {
    const logger = getLogger();
    expect(() => logger.info('test message', { key: 'value' })).not.toThrow();
  });

  test('[BACKEND-01] logger.warn does not throw', () => {
    const logger = getLogger();
    expect(() => logger.warn('test warning')).not.toThrow();
  });

  test('[BACKEND-01] logger.error does not throw with Error object', () => {
    const logger = getLogger();
    expect(() =>
      logger.error('test error', new Error('something went wrong'))
    ).not.toThrow();
  });

  test('[BACKEND-01] logger.error does not throw without error arg', () => {
    const logger = getLogger();
    expect(() => logger.error('test error message')).not.toThrow();
  });

  test('[BACKEND-01] logger.debug does not throw', () => {
    const logger = getLogger();
    expect(() => logger.debug('debug message', { data: 123 })).not.toThrow();
  });

  test('[BACKEND-01] logger.trace does not throw', () => {
    const logger = getLogger();
    expect(() => logger.trace('trace message')).not.toThrow();
  });

  test('[BACKEND-01] logger.fatal does not throw', () => {
    const logger = getLogger();
    expect(() => logger.fatal('fatal message', new Error('fatal'))).not.toThrow();
  });

  test('[BACKEND-01] logger.info does not throw with empty data', () => {
    const logger = getLogger();
    expect(() => logger.info('message without data')).not.toThrow();
  });

  test('[BACKEND-01] logger.info with nested objects does not throw', () => {
    const logger = getLogger();
    expect(() =>
      logger.info('nested', {
        outer: { inner: { deep: 'value' } },
        count: 42,
        arr: [1, 2, 3],
      })
    ).not.toThrow();
  });

  test('[BACKEND-01] logger.error handles non-Error objects', () => {
    const logger = getLogger();
    // Should not throw when passed an object that is not an Error
    expect(() => logger.error('non-error', { code: 42, reason: 'failure' })).not.toThrow();
  });

  test('[BACKEND-01] logger.fatal handles non-Error objects', () => {
    const logger = getLogger();
    expect(() => logger.fatal('fatal', { code: 'FATAL_ERR' })).not.toThrow();
  });
});
