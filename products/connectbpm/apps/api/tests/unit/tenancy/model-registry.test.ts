/**
 * The model registry.                          ADR-004 §2 · FR-002 · AC-051
 *
 * ADR-004 requires that `withTenant` "throws on any model operation it does not
 * recognise — so a newly added model is scoped by default and a new unregistered
 * model fails loudly rather than silently leaking". That guarantee is only worth
 * anything if the registry cannot drift from the schema, so these tests compare
 * it against BOTH sources of truth: the generated Prisma client's `ModelName`
 * enum, and the `.prisma` file the gate parses.
 */
import { join } from 'node:path';
import { Prisma } from '@prisma/client';
import { parseSchema, isTenantScoped } from '../../../scripts/schema-model';
import {
  GLOBAL_MODELS,
  TENANT_SCOPED_MODELS,
  assertKnownModel,
  isTenantScopedModel,
} from '../../../src/tenancy/model-registry';

const SCHEMA = parseSchema(join(__dirname, '..', '..', '..', 'prisma', 'schema.prisma'));

describe('[AC-051][FR-002] tenant model registry', () => {
  it('[AC-051] classifies every model the generated client knows about', () => {
    const generated = Object.values(Prisma.ModelName).sort();
    const registered = [...TENANT_SCOPED_MODELS, ...GLOBAL_MODELS.keys()].sort();
    expect(registered).toEqual(generated);
  });

  it('[AC-051] agrees with the schema on which models carry tenantId', () => {
    const fromSchema = SCHEMA.filter(isTenantScoped).map((m) => m.name).sort();
    expect([...TENANT_SCOPED_MODELS].sort()).toEqual(fromSchema);
    expect(TENANT_SCOPED_MODELS.size).toBe(27);
  });

  it('[AC-051] holds exactly the five reviewed global models, each with a reason', () => {
    expect([...GLOBAL_MODELS.keys()].sort()).toEqual(
      ['RefreshToken', 'Template', 'TemplateLocale', 'Tenant', 'User'].sort()
    );
    for (const reason of GLOBAL_MODELS.values()) {
      expect(reason.length).toBeGreaterThan(20);
    }
  });

  it('[AC-051] THROWS on an unregistered model rather than passing it through', () => {
    expect(() => assertKnownModel('ProcessInstanceShadow')).toThrow(
      /not registered/i
    );
  });

  it('[AC-051] reports a tenant-scoped model as scoped and a global one as not', () => {
    expect(isTenantScopedModel('ProcessInstance')).toBe(true);
    expect(isTenantScopedModel('Tenant')).toBe(false);
  });
});
