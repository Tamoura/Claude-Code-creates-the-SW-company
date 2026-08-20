/**
 * Proves the RLS gate's schema reader actually reads the schema.
 *
 * The dangerous failure mode for a schema-shape gate is a parser that silently
 * reads nothing and reports a pass. `parseSchema` throws on that; these tests
 * pin the real numbers so a regression in the reader is visible.
 */
import { join } from 'node:path';
import { parseSchema, isTenantScoped } from '../../../scripts/schema-model';

const SCHEMA = join(__dirname, '..', '..', '..', 'prisma', 'schema.prisma');

const GLOBAL = ['Tenant', 'User', 'RefreshToken', 'Template', 'TemplateLocale'];

describe('RLS gate — schema reader (ADR-004)', () => {
  const models = parseSchema(SCHEMA);

  it('reads all 32 models', () => {
    expect(models).toHaveLength(32);
  });

  it('finds exactly 27 tenant-scoped models', () => {
    expect(models.filter(isTenantScoped)).toHaveLength(27);
  });

  it('agrees with the reviewed global allowlist', () => {
    const unscoped = models.filter((m) => !isTenantScoped(m)).map((m) => m.name);
    expect(unscoped.sort()).toEqual([...GLOBAL].sort());
  });

  it('resolves a @@map table name', () => {
    const instance = models.find((m) => m.name === 'ProcessInstance');
    expect(instance?.table).toBe('process_instance');
  });

  it('reads block-level indexes', () => {
    const task = models.find((m) => m.name === 'Task');
    expect(task?.indexes.length).toBeGreaterThan(0);
    expect(task?.indexes.some((i) => i.fields[0] === 'tenantId')).toBe(true);
  });
});
