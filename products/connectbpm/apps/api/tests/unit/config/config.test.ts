/**
 * TRACEABILITY NOTE (Article VI, honest version).
 *
 * These verify SCAFFOLD CONVENTIONS and non-functional requirements, not
 * feature acceptance criteria. There is no US-xx / AC-xxx / FR-xxx behind
 * "the config is memoised" — inventing one would be worse than the gap, so
 * each carries the NFR or constitutional article it genuinely serves and no
 * more. Reported to the Orchestrator as such.
 */
import { loadConfig, getConfig, resetConfigForTests } from '../../../src/config';

const ORIGINAL = { ...process.env };

describe('[NFR-008] environment configuration — bad config crashes at boot, never at first use', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL };
    resetConfigForTests();
  });

  it('[NFR-017] applies the registered ConnectBPM ports as defaults — Article VII', () => {
    resetConfigForTests();
    delete process.env.PORT;
    const config = loadConfig();
    expect(config.PORT).toBe(5018);
    expect(config.FRONTEND_URL).toBe('http://localhost:3123');
  });

  it('[NFR-008] fails fast and names every offending variable', () => {
    resetConfigForTests();
    delete process.env.DATABASE_URL;
    process.env.JWT_SECRET = 'too-short';
    expect(() => loadConfig()).toThrow(/DATABASE_URL/);
    resetConfigForTests();
    delete process.env.DATABASE_URL;
    process.env.JWT_SECRET = 'too-short';
    expect(() => loadConfig()).toThrow(/JWT_SECRET/);
  });

  it('[NFR-008] rejects a JWT secret shorter than 32 characters — API2', () => {
    resetConfigForTests();
    process.env.JWT_SECRET = 'short';
    expect(() => loadConfig()).toThrow(/JWT_SECRET/);
  });

  it('[NFR-004] coerces the job-runner role from its string env form — ADR-009', () => {
    resetConfigForTests();
    process.env.RUN_JOB_RUNNER = 'true';
    expect(loadConfig().RUN_JOB_RUNNER).toBe(true);
    resetConfigForTests();
    process.env.RUN_JOB_RUNNER = 'false';
    expect(loadConfig().RUN_JOB_RUNNER).toBe(false);
  });

  it('[NFR-008] memoises so the env is parsed once per process', () => {
    resetConfigForTests();
    expect(getConfig()).toBe(getConfig());
  });
});
