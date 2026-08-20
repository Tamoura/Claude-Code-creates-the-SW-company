/**
 * The predicate injection, without a database.  ADR-004 §2 · FR-002 · AC-051
 *
 * The branching here is the part that can be wrong, and every branch is a
 * potential leak, so it is tested directly rather than only through the four
 * or five Prisma verbs an integration test happens to exercise.
 */
import { scopeArgs } from '../../../src/tenancy/scope-args';

const TENANT = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';

describe('[AC-051][FR-002] scopeArgs injects the tenant into every verb', () => {
  describe('[AC-051] read verbs', () => {
    it.each([
      'findUnique',
      'findUniqueOrThrow',
      'findFirst',
      'findFirstOrThrow',
      'findMany',
      'count',
      'aggregate',
      'groupBy',
    ])('[AC-051] adds tenantId to the where of %s', (operation) => {
      expect(scopeArgs(operation, undefined, TENANT)).toEqual({
        where: { tenantId: TENANT },
      });
    });

    it('[AC-051] keeps the caller\'s where and adds the tenant beside it', () => {
      expect(scopeArgs('findMany', { where: { status: 'ACTIVE' }, take: 10 }, TENANT)).toEqual({
        where: { status: 'ACTIVE', tenantId: TENANT },
        take: 10,
      });
    });

    it("[AC-051] overrides a caller-supplied tenantId rather than trusting it", () => {
      expect(scopeArgs('findMany', { where: { tenantId: OTHER } }, TENANT)).toEqual({
        where: { tenantId: TENANT },
      });
    });
  });

  describe('[AC-051] write verbs', () => {
    it('[AC-051] stamps tenantId onto create', () => {
      expect(scopeArgs('create', { data: { name: 'x' } }, TENANT)).toEqual({
        data: { name: 'x', tenantId: TENANT },
      });
    });

    it('[AC-051] stamps every row of a createMany array', () => {
      expect(scopeArgs('createMany', { data: [{ n: 1 }, { n: 2, tenantId: OTHER }] }, TENANT)).toEqual({
        data: [
          { n: 1, tenantId: TENANT },
          { n: 2, tenantId: TENANT },
        ],
      });
    });

    it('[AC-051] STRIPS tenantId from an update payload — a row cannot change tenant', () => {
      expect(scopeArgs('update', { where: { id: 'a' }, data: { tenantId: OTHER, n: 1 } }, TENANT)).toEqual({
        where: { id: 'a', tenantId: TENANT },
        data: { n: 1 },
      });
    });

    it('[AC-051] scopes all three limbs of an upsert', () => {
      expect(
        scopeArgs(
          'upsert',
          { where: { id: 'a' }, create: { n: 1 }, update: { n: 2, tenantId: OTHER } },
          TENANT
        )
      ).toEqual({
        where: { id: 'a', tenantId: TENANT },
        create: { n: 1, tenantId: TENANT },
        update: { n: 2 },
      });
    });

    it.each(['delete', 'deleteMany', 'updateMany'])(
      '[AC-051] scopes the where of %s, so an unpredicated call hits one tenant',
      (operation) => {
        expect(scopeArgs(operation, undefined, TENANT)).toMatchObject({
          where: { tenantId: TENANT },
        });
      }
    );
  });

  describe('[AC-051] failing closed', () => {
    it('[AC-051] THROWS on an operation it does not enumerate, rather than passing it through', () => {
      expect(() => scopeArgs('findRaw', { filter: {} }, TENANT)).toThrow(
        /does not know how to scope/
      );
    });
  });
});
