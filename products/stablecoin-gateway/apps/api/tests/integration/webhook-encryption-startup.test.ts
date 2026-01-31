describe('Webhook encryption startup enforcement', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalKey = process.env.WEBHOOK_ENCRYPTION_KEY;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalKey !== undefined) {
      process.env.WEBHOOK_ENCRYPTION_KEY = originalKey;
    } else {
      delete process.env.WEBHOOK_ENCRYPTION_KEY;
    }
  });

  it('should throw in production when WEBHOOK_ENCRYPTION_KEY is missing', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.WEBHOOK_ENCRYPTION_KEY;

    // Re-import to get fresh module behavior
    const { enforceProductionEncryption } = await import(
      '../../src/utils/startup-checks.js'
    );

    expect(() => enforceProductionEncryption()).toThrow(
      'WEBHOOK_ENCRYPTION_KEY'
    );
  });

  it('should not throw in dev/test without key', async () => {
    process.env.NODE_ENV = 'test';
    delete process.env.WEBHOOK_ENCRYPTION_KEY;

    const { enforceProductionEncryption } = await import(
      '../../src/utils/startup-checks.js'
    );

    expect(() => enforceProductionEncryption()).not.toThrow();
  });

  it('should not throw in any env when key is present', async () => {
    process.env.NODE_ENV = 'production';
    process.env.WEBHOOK_ENCRYPTION_KEY = 'a'.repeat(64);

    const { enforceProductionEncryption } = await import(
      '../../src/utils/startup-checks.js'
    );

    expect(() => enforceProductionEncryption()).not.toThrow();
  });
});
