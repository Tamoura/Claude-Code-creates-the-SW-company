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
 *   E. The ONE cross-tenant exception — the job-claim boundary (ADR-010) — is
 *      exactly as narrow as the ADR says it is. This check exists because the
 *      exception is the only hole in A-D, so it is the only thing whose
 *      widening would not be caught by anything else. Static form: the DDL is
 *      present in the migrations. `--live` form: the owner, the NOLOGIN /
 *      NOBYPASSRLS posture, the pinned search_path, the column privileges, and
 *      the fact that the API role cannot call the functions at all.
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
    'ADR-009 + ADR-010: the runner claims due jobs ACROSS all tenants, through ' +
    'the SECURITY DEFINER function `app_claim_due_jobs` — the ONE cross-tenant ' +
    'reach in this schema, asserted by check E. The partial index it needs, ' +
    "`(run_at, id) WHERE status = 'PENDING'`, is `job_due_pending_idx` in " +
    '20260820150000_job_claim_boundary; Prisma cannot express the predicate, so ' +
    'this non-partial declaration is what keeps the two from drifting. A ' +
    'tenantId prefix would force the runner to poll per tenant, which is the ' +
    'exact failure mode ADR-005 rejected third-party engines for.',
  'Subscription:tier,status':
    'Control-plane query ("every tenant on Growth that is past due"). It is ' +
    'run by the billing reconciliation, never by a tenant request path. The ' +
    'per-tenant lookup is by the unique tenantId column.',
};

/**
 * The job-claim boundary (ADR-010). Every constant here is asserted against the
 * database, so widening any of them in a migration turns this gate red.
 */
const CLAIM_FUNCTIONS = ['app_claim_due_jobs', 'app_reap_expired_job_leases'] as const;
const CLAIM_OWNER = 'connectbpm_job_claimer';
const RUNNER_ROLE = 'connectbpm_runner';
const APP_ROLE = 'connectbpm_app';
/** The claim principal may read these columns of `job`, and no others. */
const CLAIMER_SELECT_COLUMNS = ['id', 'tenant_id', 'run_at', 'status', 'attempts', 'locked_until'];
/** ...and write these. Note `tenant_id` and `payload` are in neither list. */
const CLAIMER_UPDATE_COLUMNS = ['status', 'locked_by', 'locked_until', 'attempts', 'updated_at'];

interface Violation {
  check: 'A' | 'B' | 'C' | 'D' | 'E';
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

// ─── E. the job-claim boundary, statically ───────────────────────────────────
/**
 * ADR-010 is the ONE place a principal reaches across tenants. Checks A-D
 * cannot see it — `job` still has ENABLE, FORCE and `tenant_isolation`, so D is
 * green either way. The exception is therefore the only part of the isolation
 * argument with no mechanical guard, which is precisely why it needs one.
 */
function checkClaimBoundaryDdl(): void {
  const sql = readMigrationSql();
  if (sql === null) return; // C has already reported the missing directory.

  for (const fn of CLAIM_FUNCTIONS) {
    if (!sql.includes(`function public.${fn}(`)) {
      fail('E', `the job-claim boundary function public.${fn}() is not created by any migration (ADR-010). Without it the runner's cross-tenant claim matches zero rows and reports success — no error, no log, timers silently never fire.`);
    }
  }
  if (!sql.includes('security definer')) {
    fail('E', 'no SECURITY DEFINER function in the migrations. The claim boundary is a SECURITY DEFINER function owned by a NOLOGIN role; without it nothing can claim across tenants (ADR-010).');
  }
  if (!sql.includes('set search_path = pg_catalog')) {
    fail('E', 'a SECURITY DEFINER function without a pinned `SET search_path` resolves names through the CALLER\'s search_path, which is a privilege-escalation shape (ADR-010).');
  }
  if (sql.includes('bypassrls') && !sql.includes('nobypassrls')) {
    fail('E', 'a migration mentions BYPASSRLS. ADR-004 §3 and ADR-010 both forbid it: a BYPASSRLS role is exempt from every policy on every table, which is the opposite of a bounded exception.');
  }
  // The load-bearing conjunct. `TO connectbpm_job_claimer` alone also matches
  // every MEMBER of that role, and the migrator must be a member to transfer
  // ownership of the functions. Verified: without this the migrator sees every
  // tenant's jobs.
  if (!sql.includes(`current_user = '${CLAIM_OWNER}'`)) {
    fail('E', `the claimer policies on "job" do not test \`current_user = '${CLAIM_OWNER}'\`. A policy targeted only \`TO ${CLAIM_OWNER}\` also applies to every member of that role — including ${'connectbpm_migrator'}, which must be a member to own the functions (ADR-010).`);
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

    await checkLiveClaimBoundary(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

// ─── E. the job-claim boundary, live ─────────────────────────────────────────
interface LiveDb {
  $queryRawUnsafe<T>(query: string): Promise<T>;
}

/**
 * The owner's posture. A LOGIN role would make the SECURITY DEFINER boundary
 * decorative — the confinement IS that no session can be this role except one a
 * claim function opened. BYPASSRLS would make the bounded exception unbounded.
 */
async function checkClaimOwnerPosture(prisma: LiveDb): Promise<void> {
  const roles = await prisma.$queryRawUnsafe<
    Array<{ rolname: string; rolcanlogin: boolean; rolsuper: boolean; rolbypassrls: boolean }>
  >(`SELECT rolname, rolcanlogin, rolsuper, rolbypassrls FROM pg_roles
      WHERE rolname IN ('${CLAIM_OWNER}', '${RUNNER_ROLE}', '${APP_ROLE}')`);
  const byRole = new Map(roles.map((r) => [r.rolname, r]));

  const owner = byRole.get(CLAIM_OWNER);
  if (owner === undefined) {
    fail('E', `role ${CLAIM_OWNER} does not exist. Run \`pnpm db:roles\` (ADR-010).`);
  } else {
    if (owner.rolcanlogin) fail('E', `${CLAIM_OWNER} can LOG IN. Its whole confinement is that the only way to act as it is to call a function it owns.`);
    if (owner.rolsuper) fail('E', `${CLAIM_OWNER} is SUPERUSER — exempt from every policy on every table.`);
    if (owner.rolbypassrls) fail('E', `${CLAIM_OWNER} has BYPASSRLS — the exception is no longer bounded to one table.`);
  }

  for (const name of [RUNNER_ROLE, APP_ROLE]) {
    const role = byRole.get(name);
    if (role === undefined) {
      fail('E', `role ${name} does not exist. Run \`pnpm db:roles\`.`);
    } else if (role.rolsuper || role.rolbypassrls) {
      fail('E', `${name} is superuser or BYPASSRLS — row-level security does nothing on its connection (ADR-004 §3).`);
    }
  }
}

/** Present, SECURITY DEFINER, owned by the claimer, `search_path` pinned. */
async function checkClaimFunctions(prisma: LiveDb): Promise<void> {
  const fns = await prisma.$queryRawUnsafe<
    Array<{ proname: string; owner: string; prosecdef: boolean; proconfig: string[] | null }>
  >(`SELECT p.proname, pg_get_userbyid(p.proowner) AS owner, p.prosecdef, p.proconfig
       FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname IN (${CLAIM_FUNCTIONS.map((f) => `'${f}'`).join(', ')})`);

  for (const name of CLAIM_FUNCTIONS) {
    const fn = fns.find((f) => f.proname === name);
    if (fn === undefined) {
      fail('E', `function public.${name}() is absent. The runner cannot claim, and it will not say so — it will report success on zero rows.`);
      continue;
    }
    if (!fn.prosecdef) fail('E', `public.${name}() is not SECURITY DEFINER — it runs as the caller and claims nothing (this is the ARCH-02 bug).`);
    if (fn.owner !== CLAIM_OWNER) fail('E', `public.${name}() is owned by ${fn.owner}, not ${CLAIM_OWNER}. FORCE ROW LEVEL SECURITY binds the table OWNER too, so a function owned by connectbpm_migrator claims ZERO rows — verified in ARCH-02.`);
    if (!(fn.proconfig ?? []).some((c) => c.startsWith('search_path='))) {
      fail('E', `public.${name}() has no pinned search_path. A SECURITY DEFINER function that resolves names through the CALLER's search_path is a privilege-escalation shape.`);
    }
  }
}

/**
 * EXECUTE belongs to the runner and to nothing else. The API role is checked
 * explicitly: a bug on the HTTP surface must not be able to lease every
 * tenant's timers, which would suppress the engine globally.
 */
async function checkClaimExecuteGrants(prisma: LiveDb): Promise<void> {
  for (const name of CLAIM_FUNCTIONS) {
    const [priv] = await prisma.$queryRawUnsafe<Array<{ runner: boolean; app: boolean }>>(
      `SELECT has_function_privilege('${RUNNER_ROLE}', p.oid, 'EXECUTE') AS runner,
              has_function_privilege('${APP_ROLE}',    p.oid, 'EXECUTE') AS app
         FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = '${name}'`
    );
    if (priv === undefined) continue; // absence already reported
    if (!priv.runner) fail('E', `${RUNNER_ROLE} cannot EXECUTE public.${name}() — the runner has no way to claim.`);
    if (priv.app) fail('E', `${APP_ROLE} CAN EXECUTE public.${name}(). The API role must not be able to lease other tenants' jobs (ADR-010) — that is a cross-tenant availability attack reachable from the HTTP surface.`);
  }
}

/**
 * The real width of the exception. The policy decides which ROWS the claim
 * principal sees; these grants decide which COLUMNS it can name at all, and
 * they are narrower. A rewritten function body cannot read another tenant's
 * outbox payload even though the policy would show it the row.
 *
 * Read `pg_attribute.attacl` directly, NOT
 * `information_schema.column_privileges`: that view only shows rows the
 * QUERYING role is party to, and this gate runs as `connectbpm_app`, which is
 * neither grantor nor grantee. Using the view, the gate reported PASS while
 * `payload` was readable — measured, which is why it is not used here.
 */
async function checkClaimColumnGrants(prisma: LiveDb): Promise<void> {
  const cols = await prisma.$queryRawUnsafe<Array<{ privilege_type: string; column_name: string }>>(
    `SELECT acl.privilege_type, a.attname AS column_name
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
       CROSS JOIN LATERAL aclexplode(a.attacl) acl
      WHERE n.nspname = 'public' AND c.relname = 'job'
        AND acl.grantee = (SELECT oid FROM pg_roles WHERE rolname = '${CLAIM_OWNER}')`
  );
  const beyond = (type: string, allowed: string[]): string[] =>
    cols.filter((c) => c.privilege_type === type && !allowed.includes(c.column_name))
      .map((c) => c.column_name).sort();

  const selectExtra = beyond('SELECT', CLAIMER_SELECT_COLUMNS);
  if (selectExtra.length > 0) {
    fail('E', `${CLAIM_OWNER} can SELECT column(s) [${selectExtra.join(', ')}] of "job" beyond the reviewed set [${CLAIMER_SELECT_COLUMNS.join(', ')}] (ADR-010). \`payload\` carries outbox bodies, which are tenant CONTENT.`);
  }
  const updateExtra = beyond('UPDATE', CLAIMER_UPDATE_COLUMNS);
  if (updateExtra.length > 0) {
    fail('E', `${CLAIM_OWNER} can UPDATE column(s) [${updateExtra.join(', ')}] of "job" beyond the reviewed set [${CLAIMER_UPDATE_COLUMNS.join(', ')}] (ADR-010).`);
  }
  for (const type of ['INSERT', 'DELETE', 'TRUNCATE', 'REFERENCES']) {
    if (cols.some((c) => c.privilege_type === type)) {
      fail('E', `${CLAIM_OWNER} holds ${type} on "job". It may only move a job between PENDING and CLAIMED.`);
    }
  }
}

/** The exception is meant to be exactly one table wide. */
async function checkClaimTableReach(prisma: LiveDb): Promise<void> {
  const rows = await prisma.$queryRawUnsafe<Array<{ table_name: string }>>(
    `WITH claimer AS (SELECT oid FROM pg_roles WHERE rolname = '${CLAIM_OWNER}')
     SELECT DISTINCT c.relname AS table_name
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       CROSS JOIN LATERAL aclexplode(c.relacl) acl
      WHERE n.nspname = 'public' AND c.relkind = 'r'
        AND acl.grantee = (SELECT oid FROM claimer)
      UNION
     SELECT DISTINCT c.relname
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
       CROSS JOIN LATERAL aclexplode(a.attacl) acl
      WHERE n.nspname = 'public' AND c.relkind = 'r'
        AND acl.grantee = (SELECT oid FROM claimer)`
  );
  const reached = rows.map((r) => r.table_name).filter((t) => t !== 'job').sort();
  if (reached.length > 0) {
    fail('E', `${CLAIM_OWNER} holds privileges on [${reached.join(', ')}] as well as "job". The cross-tenant exception is meant to be one table wide (ADR-010).`);
  }
}

/**
 * `tenant_isolation` on `job` is still there and still unconditional. ADR-010
 * chose an ADDITIVE policy over amending the shared one precisely so that this
 * predicate keeps no branch in it — a predicate with no branch cannot fail
 * open. If this fires, the option that was rejected has been adopted by
 * accident.
 */
async function checkClaimPolicyIsAdditive(prisma: LiveDb): Promise<void> {
  const policies = await prisma.$queryRawUnsafe<Array<{ policyname: string; qual: string | null }>>(
    `SELECT policyname, qual FROM pg_policies WHERE schemaname = 'public' AND tablename = 'job'`
  );
  const isolation = policies.find((p) => p.policyname === 'tenant_isolation');
  if (isolation === undefined) {
    fail('E', '"job" has no `tenant_isolation` policy. The claim exception is additive — it does not replace the tenant predicate.');
    return;
  }
  const qual = isolation.qual ?? '';
  if (qual.includes('current_user') || / or /i.test(qual)) {
    fail('E', `"job".tenant_isolation has grown a role clause or a disjunction: ${qual}. ADR-010 chose an additive policy so that this one stays a single unconditional equality.`);
  }
}

async function checkLiveClaimBoundary(prisma: LiveDb): Promise<void> {
  await checkClaimOwnerPosture(prisma);
  await checkClaimFunctions(prisma);
  await checkClaimExecuteGrants(prisma);
  await checkClaimColumnGrants(prisma);
  await checkClaimTableReach(prisma);
  await checkClaimPolicyIsAdditive(prisma);
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
  checkClaimBoundaryDdl();
  if (live) await checkLiveDatabase(scoped);

  const out = process.stdout;
  out.write('RLS / tenant-isolation gate (ADR-004)\n');
  out.write(`  models parsed        : ${models.length}\n`);
  out.write(`  tenant-scoped        : ${scoped.length}\n`);
  out.write(`  global (allowlisted) : ${models.length - scoped.length}\n`);
  out.write(`  live DB assertion    : ${live ? 'ON' : 'off (pass --live in CI once a DB exists)'}\n`);
  out.write(`  claim boundary (E)   : ${live ? 'static + live' : 'static only'} — ADR-010, the one cross-tenant exception\n`);
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
