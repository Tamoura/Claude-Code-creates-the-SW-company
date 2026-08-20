/**
 * Proves the metering-boundary gate is an enforcing check, not a stub.
 *
 * A gate that always passes is worse than no gate — it reads as protection
 * that is not there. These tests feed it a real violation and require it to
 * find it, and feed it the real source tree and require it to stay clean.
 */
import { scan } from '../../../scripts/check-metering-boundary';
import { join } from 'node:path';

const FIXTURE_BASE = join(__dirname, '..', '..', 'fixtures', 'metering-violations');
const ALLOWED_BASE = join(__dirname, '..', '..', 'fixtures', 'metering-allowed');

describe('[AC-012][AC-013] metering-boundary gate', () => {
  it('[AC-012][AC-013] detects every violation class in the fixture', () => {
    const findings = scan(['src'], FIXTURE_BASE);
    const rules = new Set(findings.map((f) => f.rule));

    expect(rules).toContain('AC-013/usage-service-import');
    expect(rules).toContain('AC-012/usage-event-write-outside-ledger');
    expect(rules).toContain('MET-5/usage-event-mutation');
    expect(rules).toContain('NFR-009/dynamic-code-execution');
  });

  it('[AC-012] reports the reason, not just the location', () => {
    const findings = scan(['src'], FIXTURE_BASE);
    const usageService = findings.find(
      (f) => f.rule === 'AC-013/usage-service-import'
    );
    expect(usageService).toBeDefined();
    expect(usageService?.why).toMatch(/MET-2/);
    expect(usageService?.file).toBe('src/services/bad-metering.ts');
  });

  it('[AC-012][AC-013] finds no violation in the shipped API source', () => {
    const findings = scan(['src']);
    expect(findings).toEqual([]);
  });

  it('[AC-013] permits UsageService under the soft-limit allowlist only', () => {
    const findings = scan(['src'], ALLOWED_BASE);
    const usageService = findings.filter(
      (f) => f.rule === 'AC-013/usage-service-import'
    );
    expect(usageService).toEqual([]);
  });

  it('[AC-012] permits usageEvent.create in the ledger module only', () => {
    const findings = scan(['src'], ALLOWED_BASE);
    const writes = findings.filter(
      (f) => f.rule === 'AC-012/usage-event-write-outside-ledger'
    );
    expect(writes).toEqual([]);
  });

  it('[AC-012] does not flag prose in comments', () => {
    const findings = scan(['src'], ALLOWED_BASE);
    expect(findings.filter((f) => f.file.includes('comments.ts'))).toEqual([]);
  });

  it('[AC-012] returns nothing for a root that does not exist', () => {
    expect(scan(['does-not-exist'], ALLOWED_BASE)).toEqual([]);
  });
});
