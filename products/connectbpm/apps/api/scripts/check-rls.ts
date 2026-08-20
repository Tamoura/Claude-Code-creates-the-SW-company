#!/usr/bin/env tsx
/**
 * CI GATE — Row-Level Security / tenant isolation.   ADR-004, NFR-008, AC-051
 *
 * A cross-tenant leak is the one existential bug in this product. This gate
 * asserts, mechanically and on every build, the four structural properties the
 * isolation argument rests on:
 *
 *   A. Every model carries `tenantId` unless it is on the reviewed global
 *      allowlist. The allowlist is the one enumerated in the trailer of
 *      `docs/db-schema.prisma` (note 4) — five models, each for a stated reason.
 *   B. Every `@@index` on a tenant-scoped model LEADS with `tenantId`, except
 *      for the small set of deliberately cross-tenant lookups named below.
 *   C. Every tenant-scoped TABLE has `ENABLE ROW LEVEL SECURITY`,
 *      `FORCE ROW LEVEL SECURITY` and a policy, in the migration SQL.
 *   D. `--live`: the same assertion against a real database, comparing
 *      `pg_class.relrowsecurity` / `relforcerowsecurity` and `pg_policies`.
 *      This is the authoritative form; C is the fast pre-check.
 *
 * STATUS TODAY: A and B run and pass against the 32-model schema. C fails
 * because `prisma/migrations/` does not exist yet — the RLS DDL is written by
 * the tenancy task, not by scaffolding. That failure is deliberate: a gate that
 * passed here would be reporting protection that is not present.
 *
 * Exit codes: 0 pass · 1 violation · 2 gate could not run.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parseSchema, isTenantScoped, type PrismaModel } from './schema-model';

const SCHEMA_PATH = join(__dirname, '..', 'prisma', 'schema.prisma');
const MIGRATIONS_DIR = join(__dirname, '..', 'prisma', 'migrations');

/**
 * Models deliberately NOT tenant-scoped. Source: `docs/db-schema.prisma`
 * trailer, note 4. Adding an entry here is a reviewed act and requires the
 * reason to be written down next to it.
 */
const GLOBAL_MODELS: Record<string, string> = {
  Tenant: 'It IS the tenant; isolation is by its own id.',
  User: 'Global identity — one human, many tenants via Membership.',
  RefreshToken:
    'Scoped to the User. Tenant context comes from Membership; scoping the ' +
    'session would force re-login per workspace and fragment revocation.',
  Template: 'The shared template library is global by design.',
  TemplateLocale: 'Locale variants of Template.',
};

/**
 * `@@index` entries on tenant-scoped models that legitimately do not lead with
 * `tenantId`, because the lookup is inherently cross-tenant. Keyed
 * `Model:field,field`. Each needs a reason.
 */
const INDEX_EXCEPTIONS: Record<string, string> = {
  'Membership:userId':
    'Workspace switching: "which tenants does this user belong to" is a ' +
    'cross-tenant question by definition (FR-002).',
  'Job:runAt,id':
    'ADR-009: the runner claims due jobs ACROSS all tenants with ' +
    'SELECT FOR UPDATE SKIP LOCKED. In SQL this is the partial index ' +
    "`(run_at, id) WHERE status = 'PENDING'` added by a raw migration. A " +
    'tenantId prefix would force the runner to poll per tenant, which is the ' +
    'exact failure mode ADR-005 rejected third-party engines for.',
  'Subscription:tier,status':
    'Control-plane query ("every tenant on Growth that is past due"). It is ' +
    'run by the billing reconciliation, never by a tenant request path. The ' +
    'per-tenant lookup is by the unique tenantId column.',
};

interface Violation {
  check: 'A' | 'B' | 'C' | 'D';
  message: string;
}

const violations: Violation[] = [];
const notes: string[] = [];

function fail(check: Violation['check'], message: string): void {
  violations.push({ check, message });
}

// ─── A. tenantId presence ────────────────────────────────────────────────────
function checkTenantIdPresence(models: PrismaModel[]): PrismaModel[] {
  const scoped: PrismaModel[] = [];

  for (const model of models) {
    const allowlisted = Object.prototype.hasOwnProperty.call(
      GLOBAL_MODELS,
      model.name
    );
    const scopedModel = isTenantScoped(model);

    if (!scopedModel && !allowlisted) {
      fail(
        'A',
        `model ${model.name} (schema line ${model.line}) has no \`tenantId\` ` +
          `and is not on the reviewed global allowlist. Either add tenantId or ` +
          `add it to GLOBAL_MODELS in this file with a written reason.`
      );
    }
    if (scopedModel && allowlisted) {
      fail(
        'A',
        `model ${model.name} is on the global allowlist but declares ` +
          `\`tenantId\`. The allowlist is stale — remove the entry.`
      );
    }
    if (scopedModel) scoped.push(model);
  }

  for (const name of Object.keys(GLOBAL_MODELS)) {
    if (!models.some((m) => m.name === name)) {
      fail(
        'A',
        `global allowlist names model ${name}, which no longer exists in the ` +
          `schema. Remove the stale entry.`
      );
    }
  }

  return scoped;
}

// ─── B. index prefix ─────────────────────────────────────────────────────────
function checkIndexPrefix(scoped: PrismaModel[]): void {
  for (const model of scoped) {
    for (const index of model.indexes) {
      // `@@unique` on a globally unique parent id is correct without a tenant
      // prefix; ADR-004's rule is about query-plan indexes.
      if (index.kind !== 'index') continue;
      if (index.fields[0] === 'tenantId') continue;

      const key = `${model.name}:${index.fields.join(',')}`;
      if (Object.prototype.hasOwnProperty.call(INDEX_EXCEPTIONS, key)) {
        notes.push(`exception applied — ${key}: ${INDEX_EXCEPTIONS[key]}`);
        continue;
      }

      fail(
        'B',
        `${model.name}: ${index.raw} does not lead with tenantId (ADR-004 §1). ` +
          `Reorder it, or add "${key}" to INDEX_EXCEPTIONS with a reason.`
      );
    }
  }
}

// ─── C. RLS DDL in migrations ────────────────────────────────────────────────
function readMigrationSql(): string | null {
  if (!existsSync(MIGRATIONS_DIR)) return null;

  const chunks: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (entry.endsWith('.sql')) chunks.push(readFileSync(full, 'utf-8'));
    }
  };
  walk(MIGRATIONS_DIR);
  return chunks.join('\n').toLowerCase();
}

function checkRlsDdl(scoped: PrismaModel[]): void {
  const sql = readMigrationSql();

  if (sql === null) {
    fail(
      'C',
      `no \`prisma/migrations/\` directory. ${scoped.length} tenant-scoped ` +
        `tables therefore have NO row-level security. The RLS migration is ` +
        `owned by the tenancy task; until it lands this gate fails by design ` +
        `(ADR-004 §3 — RLS is mandatory, not a hardening option).`
    );
    return;
  }

  for (const model of scoped) {
    const t = model.table.toLowerCase();
    const enabled =
      sql.includes(`alter table "${t}" enable row level security`) ||
      sql.includes(`alter table ${t} enable row level security`);
    const forced =
      sql.includes(`alter table "${t}" force row level security`) ||
      sql.includes(`alter table ${t} force row level security`);
    const policy =
      sql.includes(`on "${t}"`) && sql.includes('create policy');

    if (!enabled) fail('C', `table "${t}" (${model.name}): missing ENABLE ROW LEVEL SECURITY`);
    if (!forced) fail('C', `table "${t}" (${model.name}): missing FORCE ROW LEVEL SECURITY`);
    if (!policy) fail('C', `table "${t}" (${model.name}): no CREATE POLICY found`);
  }
}

// ─── D. live database assertion ──────────────────────────────────────────────
async function checkLiveDatabase(scoped: PrismaModel[]): Promise<void> {
  // Imported lazily so the static gate runs without a generated client.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaClient } = require('@prisma/client') as typeof import('@prisma/client');
  const prisma = new PrismaClient();

  try {
    const rows = await prisma.$queryRawUnsafe<
      Array<{ relname: string; relrowsecurity: boolean; relforcerowsecurity: boolean; policies: bigint }>
    >(`
      SELECT c.relname,
             c.relrowsecurity,
             c.relforcerowsecurity,
             (SELECT count(*) FROM pg_policy p WHERE p.polrelid = c.oid) AS policies
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'
    `);

    const byTable = new Map(rows.map((r) => [r.relname, r]));

    for (const model of scoped) {
      const row = byTable.get(model.table);
      if (!row) {
        fail('D', `table "${model.table}" (${model.name}) is not present in the database`);
        continue;
      }
      if (!row.relrowsecurity) fail('D', `table "${model.table}": row level security not ENABLED`);
      if (!row.relforcerowsecurity) fail('D', `table "${model.table}": row level security not FORCED`);
      if (Number(row.policies) === 0) fail('D', `table "${model.table}": has no policy`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

// ─── main ────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const live = process.argv.includes('--live');

  if (!existsSync(SCHEMA_PATH)) {
    process.stderr.write(`GATE CANNOT RUN: ${SCHEMA_PATH} not found\n`);
    process.exit(2);
  }

  const models = parseSchema(SCHEMA_PATH);
  const scoped = checkTenantIdPresence(models);
  checkIndexPrefix(scoped);
  checkRlsDdl(scoped);
  if (live) await checkLiveDatabase(scoped);

  const out = process.stdout;
  out.write('RLS / tenant-isolation gate (ADR-004)\n');
  out.write(`  models parsed        : ${models.length}\n`);
  out.write(`  tenant-scoped        : ${scoped.length}\n`);
  out.write(`  global (allowlisted) : ${models.length - scoped.length}\n`);
  out.write(`  live DB assertion    : ${live ? 'ON' : 'off (pass --live in CI once a DB exists)'}\n`);
  for (const note of notes) out.write(`  note: ${note}\n`);

  if (violations.length === 0) {
    out.write('\nPASS — every tenant-scoped table is scoped, indexed and RLS-protected.\n');
    return;
  }

  out.write(`\nFAIL — ${violations.length} violation(s):\n`);
  for (const v of violations) out.write(`  [${v.check}] ${v.message}\n`);
  process.exit(1);
}

main().catch((error: unknown) => {
  process.stderr.write(
    `GATE CANNOT RUN: ${error instanceof Error ? error.message : String(error)}\n`
  );
  process.exit(2);
});
