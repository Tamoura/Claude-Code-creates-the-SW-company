import { loadConfig, getConfig, resetConfigForTests } from '../../../src/config';

const ORIGINAL = { ...process.env };

describe('environment configuration', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL };
    resetConfigForTests();
  });

  it('applies the registered ConnectBPM ports as defaults', () => {
    resetConfigForTests();
    delete process.env.PORT;
    const config = loadConfig();
    expect(config.PORT).toBe(5018);
    expect(config.FRONTEND_URL).toBe('http://localhost:3123');
  });

  it('fails fast and names every offending variable', () => {
    resetConfigForTests();
    delete process.env.DATABASE_URL;
    process.env.JWT_SECRET = 'too-short';
    expect(() => loadConfig()).toThrow(/DATABASE_URL/);
    resetConfigForTests();
    delete process.env.DATABASE_URL;
    process.env.JWT_SECRET = 'too-short';
    expect(() => loadConfig()).toThrow(/JWT_SECRET/);
  });

  it('rejects a JWT secret shorter than 32 characters', () => {
    resetConfigForTests();
    process.env.JWT_SECRET = 'short';
    expect(() => loadConfig()).toThrow(/JWT_SECRET/);
  });

  it('coerces the job-runner role from its string env form', () => {
    resetConfigForTests();
    process.env.RUN_JOB_RUNNER = 'true';
    expect(loadConfig().RUN_JOB_RUNNER).toBe(true);
    resetConfigForTests();
    process.env.RUN_JOB_RUNNER = 'false';
    expect(loadConfig().RUN_JOB_RUNNER).toBe(false);
  });

  it('memoises so the env is parsed once per process', () => {
    resetConfigForTests();
    expect(getConfig()).toBe(getConfig());
  });
});
