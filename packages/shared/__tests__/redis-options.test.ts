import { getRedisOptions } from '../src/plugins/redis';

describe('getRedisOptions', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.REDIS_TLS;
    delete process.env.REDIS_TLS_REJECT_UNAUTHORIZED;
    delete process.env.REDIS_PASSWORD;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns options without TLS by default', () => {
    const options = getRedisOptions();
    expect(options.tls).toBeUndefined();
  });

  it('enables TLS when REDIS_TLS=true', () => {
    process.env.REDIS_TLS = 'true';
    const options = getRedisOptions();
    expect(options.tls).toBeDefined();
    expect(options.tls?.rejectUnauthorized).toBe(true);
  });

  it('allows self-signed certs when REDIS_TLS_REJECT_UNAUTHORIZED=false', () => {
    process.env.REDIS_TLS = 'true';
    process.env.REDIS_TLS_REJECT_UNAUTHORIZED = 'false';
    const options = getRedisOptions();
    expect(options.tls?.rejectUnauthorized).toBe(false);
  });

  it('sets password when REDIS_PASSWORD is provided', () => {
    process.env.REDIS_PASSWORD = 'my-redis-password';
    const options = getRedisOptions();
    expect(options.password).toBe('my-redis-password');
  });

  it('does not set password when REDIS_PASSWORD is not provided', () => {
    const options = getRedisOptions();
    expect(options.password).toBeUndefined();
  });

  it('includes maxRetriesPerRequest setting', () => {
    const options = getRedisOptions();
    expect(options.maxRetriesPerRequest).toBe(3);
  });

  it('includes a retryStrategy function', () => {
    const options = getRedisOptions();
    expect(typeof options.retryStrategy).toBe('function');
  });

  it('retryStrategy returns increasing delays', () => {
    const options = getRedisOptions();
    const delay1 = (options.retryStrategy as (times: number) => number)(1);
    const delay2 = (options.retryStrategy as (times: number) => number)(10);
    expect(delay1).toBeLessThan(delay2);
    expect(delay2).toBeLessThanOrEqual(2000);
  });
});
