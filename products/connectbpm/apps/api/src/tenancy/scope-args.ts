/**
 * Injecting the tenant predicate into one Prisma operation.
 *                                              ADR-004 §2 · FR-002 · AC-051
 *
 * Called from the `$extends` query hook in `with-tenant.ts`, once per model
 * operation. It is a pure function of (operation, args, tenantId) so that the
 * branching — which is the part that can be wrong — is testable without a
 * database.
 *
 * FAILS CLOSED. An operation this file does not enumerate throws rather than
 * passing through unscoped: a future Prisma release adding a new model verb
 * must fail the build, not quietly become an unfiltered query. Row-level
 * security would still contain it (ADR-004 §3), but a leak stopped by the
 * second layer alone is a bug that reached production.
 */

type Args = Record<string, unknown>;

/** Verbs whose `where` selects the rows. `where` is filtered. */
const WHERE_OPERATIONS: ReadonlySet<string> = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
  'update',
  'updateMany',
  'updateManyAndReturn',
  'delete',
  'deleteMany',
]);

/** Verbs whose `data` becomes new rows. `data` is stamped. */
const CREATE_OPERATIONS: ReadonlySet<string> = new Set([
  'create',
  'createMany',
  'createManyAndReturn',
]);

function unknownOperation(operation: string): never {
  throw new Error(
    `withTenant does not know how to scope the Prisma operation "${operation}". ` +
      `It refuses to run it unscoped (ADR-004 §2). Add it to WHERE_OPERATIONS ` +
      `or CREATE_OPERATIONS in src/tenancy/scope-args.ts, with a test.`
  );
}

function asArgs(value: unknown): Args {
  return typeof value === 'object' && value !== null ? { ...(value as Args) } : {};
}

/**
 * The caller's `where` is preserved and `tenantId` is added to it. Prisma 5's
 * extended `where` uniqueness makes this legal for `findUnique`/`update`/
 * `delete` as well, so a lookup by primary key that belongs to another tenant
 * returns null instead of the row — which the API renders as 404 (FR-003).
 */
function scopeWhere(where: unknown, tenantId: string): Args {
  return { ...asArgs(where), tenantId };
}

/** `tenantId` is set from the context, overriding anything the caller passed. */
function stampOne(data: unknown, tenantId: string): Args {
  return { ...asArgs(data), tenantId };
}

function stampData(data: unknown, tenantId: string): Args | Args[] {
  return Array.isArray(data)
    ? data.map((item) => stampOne(item, tenantId))
    : stampOne(data, tenantId);
}

/**
 * An `update` may not move a row to another tenant, so `tenantId` is stripped
 * from the payload rather than trusted. `undefined` values are removed by
 * Prisma, so deleting the key is enough.
 */
function sanitiseUpdateData(data: unknown): Args | undefined {
  if (typeof data !== 'object' || data === null) return undefined;
  const copy = { ...(data as Args) };
  delete copy['tenantId'];
  return copy;
}

export function scopeArgs(operation: string, rawArgs: unknown, tenantId: string): Args {
  const args = asArgs(rawArgs);

  if (operation === 'upsert') {
    return {
      ...args,
      where: scopeWhere(args['where'], tenantId),
      create: stampOne(args['create'], tenantId),
      update: sanitiseUpdateData(args['update']) ?? {},
    };
  }

  if (CREATE_OPERATIONS.has(operation)) {
    return { ...args, data: stampData(args['data'], tenantId) };
  }

  if (!WHERE_OPERATIONS.has(operation)) unknownOperation(operation);

  const scoped: Args = { ...args, where: scopeWhere(args['where'], tenantId) };
  if ('data' in args) scoped['data'] = sanitiseUpdateData(args['data']);
  return scoped;
}
