/**
 * `withTenant` — the ONLY door to tenant data.  ADR-004 §2 · FR-002 · FR-003
 *                                               AC-051 · AC-052 · NFR-008
 *
 * CONVENTION (binding for all downstream agents):
 *   Repository and service functions take `TenantScopedClient`, never
 *   `PrismaClient`. `fastify.prisma` is the raw client and exists for
 *   migrations, the health probe and the job runner only. An engineer who
 *   reaches for it to write an unscoped query gets a TYPE ERROR, not a review
 *   comment — which is what AC-051's "does not compile" actually requires.
 *
 * The brand is closed three ways, because a brand that can be minted elsewhere
 * is decorative:
 *
 *   1. `TenantScopedBrand` is a NON-EXPORTED `unique symbol`. No other module
 *      can name the property key, so no object literal and no interface can
 *      satisfy the type, and `raw as TenantScopedClient` is rejected outright —
 *      the two types do not sufficiently overlap.
 *   2. The remaining hole is a double assertion, `raw as unknown as
 *      TenantScopedClient`, which TypeScript permits anywhere. So the brand is
 *      also a RUNTIME grant: `withTenant` records the client it produced in a
 *      module-private WeakSet, and `assertTenantScoped` refuses anything else.
 *      A forged client type-checks and then throws on first use.
 *   3. `eslint.config.mjs` bans the assertion outside `src/tenancy/`, so the
 *      forgery does not reach review either.
 *
 * The grant is REVOKED when the transaction closes. A client captured inside
 * the callback and used after it would otherwise be a use-after-commit against
 * a dead connection, with `app.tenant_id` no longer set.
 */
import { PrismaClient, Prisma } from '@prisma/client';
import { isTenantScopedModel } from './model-registry';
import { scopeArgs } from './scope-args';

declare const TenantScopedBrand: unique symbol;

/**
 * A transaction-bound Prisma client that filters every tenant-scoped model by
 * one tenant. Obtainable only from `withTenant`.
 */
export type TenantScopedClient = Prisma.TransactionClient & {
  readonly [TenantScopedBrand]: true;
};

export interface TenantContext {
  /** The workspace this unit of work belongs to. A UUID. */
  tenantId: string;
  /** Correlation, for the log line ADR-004 §5 requires. */
  requestId?: string;
}

export interface WithTenantOptions {
  /** `BEGIN READ ONLY`. ADR-004 §3: read paths take it. */
  readOnly?: boolean;
  /** `SET LOCAL statement_timeout`. 5 s for API work, 30 s for jobs. */
  statementTimeoutMs?: number;
  /** The raw client to wrap. Defaults to the one registered at boot. */
  client?: PrismaClient;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEFAULT_STATEMENT_TIMEOUT_MS = 5_000;

const liveGrants = new WeakSet<object>();
const revokedGrants = new WeakSet<object>();

let registeredClient: PrismaClient | undefined;

/** Wiring, called once by `src/plugins/tenancy.ts`. */
export function registerTenancyClient(client: PrismaClient): void {
  registeredClient = client;
}

/** Test seam. Never called by application code. */
export function resetTenancyClientForTests(): void {
  registeredClient = undefined;
}

function resolveClient(explicit?: PrismaClient): PrismaClient {
  const client = explicit ?? registeredClient;
  if (client === undefined) {
    throw new Error(
      'No Prisma client registered for tenancy. buildApp() registers one via ' +
        'src/plugins/tenancy.ts; a test may pass { client } to withTenant.'
    );
  }
  return client;
}

/**
 * Verifies at RUNTIME that this client came from `withTenant` and that its
 * transaction is still open. The type says so; this proves it.
 */
export function assertTenantScoped(db: TenantScopedClient): TenantScopedClient {
  if (liveGrants.has(db)) return db;
  if (revokedGrants.has(db)) {
    throw new Error(
      'This TenantScopedClient is no longer usable: the withTenant transaction ' +
        'it belonged to has CLOSED. Do not capture the client and use it later ' +
        '— open a new withTenant scope.'
    );
  }
  throw new Error(
    'Not a TenantScopedClient. Only withTenant() produces one (ADR-004 §2). ' +
      'A raw PrismaClient cast to this type reaches every tenant and is the ' +
      'single bug class this product cannot survive (NFR-008, STRAT-01 K6).'
  );
}

/**
 * Injects `where: { tenantId }` into every operation on a tenant-scoped model,
 * and throws on any model it does not recognise, so a model added later is
 * scoped by default rather than silently global.
 */
function tenantExtension(tenantId: string) {
  return Prisma.defineExtension({
    name: 'connectbpm-tenant-scope',
    query: {
      $allModels: {
        $allOperations({ model, operation, args, query }) {
          if (!isTenantScopedModel(model)) return query(args);
          return query(scopeArgs(operation, args, tenantId) as typeof args);
        },
      },
    },
  });
}

/**
 * The narrow slice of the client `openScope` needs. An extended client is not
 * assignable to `Prisma.TransactionClient` — `$extends` rewrites every delegate
 * signature — and widening this to `any` would silently accept a non-client.
 */
interface RawCapable {
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number>;
  $executeRaw(query: TemplateStringsArray, ...values: unknown[]): Promise<number>;
}

/**
 * Resolves and validates the statement timeout. Called by `withTenant` BEFORE the
 * transaction opens: a caller-supplied argument is rejected without touching the
 * database, so a bad argument reports itself rather than surfacing as a connection
 * error when the database happens to be unreachable. Same reasoning as the tenantId
 * check below — validate the bug where the bug is.
 */
function resolveStatementTimeout(options: WithTenantOptions): number {
  const timeout = options.statementTimeoutMs ?? DEFAULT_STATEMENT_TIMEOUT_MS;
  if (!Number.isInteger(timeout) || timeout <= 0) {
    throw new Error(`statementTimeoutMs must be a positive integer, got ${String(timeout)}`);
  }
  return timeout;
}

async function openScope(
  tx: RawCapable,
  tenantId: string,
  options: WithTenantOptions,
  timeout: number
): Promise<void> {
  // Order matters: SET TRANSACTION READ ONLY must precede any other statement.
  if (options.readOnly === true) await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');

  await tx.$executeRawUnsafe(`SET LOCAL statement_timeout = ${timeout}`);

  // Parameterised, and transaction-scoped like SET LOCAL — so it is safe behind
  // PgBouncer in transaction pooling mode and cannot leak into a recycled
  // connection (ADR-004 §3).
  await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
}

/**
 * Runs `fn` inside one transaction, scoped to one tenant at both layers: the
 * injected Prisma predicate, and `app.tenant_id` for the RLS policies.
 */
export async function withTenant<T>(
  ctx: TenantContext,
  fn: (db: TenantScopedClient) => Promise<T>,
  options: WithTenantOptions = {}
): Promise<T> {
  if (!UUID.test(ctx.tenantId)) {
    throw new Error(
      `withTenant received a tenantId that is not a UUID. The RLS policy casts ` +
        `app.tenant_id to uuid, so a malformed value would fail at the database ` +
        `rather than here, and the error would name a row instead of the bug.`
    );
  }

  // Validated before any I/O — see resolveStatementTimeout above.
  const timeout = resolveStatementTimeout(options);

  const scoped = resolveClient(options.client).$extends(tenantExtension(ctx.tenantId));

  return scoped.$transaction(async (tx) => {
    await openScope(tx, ctx.tenantId, options, timeout);
    const db = tx as unknown as TenantScopedClient;
    liveGrants.add(db);
    try {
      return await fn(db);
    } finally {
      liveGrants.delete(db);
      revokedGrants.add(db);
    }
  });
}
