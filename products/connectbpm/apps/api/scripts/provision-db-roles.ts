#!/usr/bin/env tsx
/**
 * Database role provisioning.                ADR-004 §3, T012, NFR-008, AC-049
 *
 * RLS is invisible to a privileged role. `ALTER TABLE ... FORCE ROW LEVEL
 * SECURITY` extends the policy to the table OWNER, but nothing extends it to a
 * superuser or to a role holding `BYPASSRLS`. So the second isolation layer
 * exists only if the connection the API uses is neither. That is a property of
 * the ROLES, not of the schema, which is why it lives here and not in a
 * migration — and why `tests/integration/tenancy/rls-enforcement.test.ts`
 * asserts it before it asserts anything else.
 *
 * Three roles, as ADR-004 §3 requires:
 *
 *   connectbpm_migrator   owns the schema and runs `prisma migrate`.
 *                         NOSUPERUSER, NOBYPASSRLS — FORCE RLS therefore
 *                         applies to it as well, so even the owner cannot read
 *                         across tenants.
 *   connectbpm_app        the API and the job runner. DML only, never DDL,
 *                         never ownership. NOSUPERUSER, NOBYPASSRLS.
 *   connectbpm_reconciler the nightly reconciliation (ADR-007). Same posture;
 *                         it iterates tenants through withTenant rather than
 *                         reading across them.
 *   connectbpm_runner     the job runner (ADR-009). Same posture as the app,
 *                         and separate from it for ONE reason: it is the only
 *                         role granted EXECUTE on the cross-tenant job-claim
 *                         functions (ADR-010). A bug on the HTTP surface must
 *                         not be able to lease every tenant's timers and
 *                         suppress the engine globally.
 *   connectbpm_job_claimer  NOLOGIN. Owns the two SECURITY DEFINER claim
 *                         functions and nothing else, and is the single role
 *                         named by the only cross-tenant policy in the schema
 *                         (ADR-010). NOSUPERUSER, NOBYPASSRLS — the reach comes
 *                         from a policy on ONE table over SIX readable columns
 *                         in TWO states, not from an attribute that would
 *                         exempt it from every policy on every table. `connectbpm_migrator` is made a member so
 *                         that the migration can transfer ownership of the
 *                         functions; membership alone is enough to inherit a
 *                         policy, which is why the policy's first conjunct is
 *                         `current_user = 'connectbpm_job_claimer'` and not
 *                         merely `TO connectbpm_job_claimer`.
 *
 * Run as an administrative role, BEFORE the first migration:
 *   ADMIN_DATABASE_URL=postgresql://postgres:...@host/db pnpm db:roles
 *
 * Idempotent. Re-run after a migration to pick up newly created tables (the
 * default privileges below normally make that unnecessary).
 *
 * Exit codes: 0 ok · 2 could not run.
 */
import { PrismaClient } from '@prisma/client';

export const APP_ROLE = 'connectbpm_app';
export const MIGRATOR_ROLE = 'connectbpm_migrator';
export const RECONCILER_ROLE = 'connectbpm_reconciler';
export const RUNNER_ROLE = 'connectbpm_runner';
/** NOLOGIN. Owns the claim functions; named by the one cross-tenant policy. */
export const JOB_CLAIMER_ROLE = 'connectbpm_job_claimer';

/**
 * Passwords are interpolated into DDL because PostgreSQL accepts no bind
 * parameters in `CREATE ROLE`. They are therefore constrained to a character
 * set that cannot terminate the literal, and a value outside it is REFUSED
 * rather than escaped: a rejected password is a failed build, a mis-escaped
 * one is a privilege-escalation bug.
 */
const SAFE_SECRET = /^[A-Za-z0-9_.~-]{12,128}$/;

export function assertSafePassword(role: string, password: string): void {
  if (!SAFE_SECRET.test(password)) {
    throw new Error(
      `Refusing to provision ${role}: password must match ${String(SAFE_SECRET)}. ` +
        `It is interpolated into DDL, which accepts no bind parameters, so an ` +
        `unconstrained value cannot be made safe by escaping it.`
    );
  }
}

export interface RoleSpec {
  role: string;
  password: string;
  /** `prisma migrate dev` provisions a shadow database. */
  createDb: boolean;
  /**
   * A role nothing can connect as. The claim functions' owner is NOLOGIN so
   * that the only way to execute with its identity is to call a function it
   * owns, whose body only the migrator can replace (ADR-010).
   */
  noLogin?: boolean;
}

/**
 * The DDL for one role, as discrete statements.
 *
 * Exported so it can be asserted on without a database: the NOSUPERUSER /
 * NOBYPASSRLS clauses ARE the second isolation layer, and a silent regression
 * here would disable it everywhere while every other test still passed.
 */
export function buildRoleStatements(spec: RoleSpec): string[] {
  const createdb = spec.createDb ? 'CREATEDB' : 'NOCREATEDB';

  if (spec.noLogin === true) {
    return [
      `DO $$ BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${spec.role}') THEN
           CREATE ROLE ${spec.role} NOLOGIN;
         END IF;
       END $$`,
      // NOLOGIN is re-asserted with the rest: a role that could be connected to
      // would make the SECURITY DEFINER boundary decorative.
      `ALTER ROLE ${spec.role} NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEROLE ${createdb}`,
    ];
  }

  assertSafePassword(spec.role, spec.password);
  return [
    `DO $$ BEGIN
       IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${spec.role}') THEN
         CREATE ROLE ${spec.role} LOGIN PASSWORD '${spec.password}';
       END IF;
     END $$`,
    // Re-asserted on every run, deliberately: this line is the guarantee.
    `ALTER ROLE ${spec.role} NOSUPERUSER NOBYPASSRLS NOCREATEROLE ${createdb}`,
    `ALTER ROLE ${spec.role} PASSWORD '${spec.password}'`,
  ];
}

/** Privileges. The migrator owns; app, reconciler and runner only ever do DML. */
export function buildGrantStatements(database: string): string[] {
  const dml = `${APP_ROLE}, ${RECONCILER_ROLE}, ${RUNNER_ROLE}`;
  return [
    `GRANT CONNECT ON DATABASE "${database}" TO ${MIGRATOR_ROLE}, ${dml}`,
    `ALTER SCHEMA public OWNER TO ${MIGRATOR_ROLE}`,
    `GRANT USAGE ON SCHEMA public TO ${dml}`,
    `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${dml}`,
    `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${dml}`,
    // Objects a FUTURE migration creates. Without this, every migration would
    // have to remember to grant, and the one that forgets fails at runtime
    // rather than in CI.
    `ALTER DEFAULT PRIVILEGES FOR ROLE ${MIGRATOR_ROLE} IN SCHEMA public
       GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${dml}`,
    `ALTER DEFAULT PRIVILEGES FOR ROLE ${MIGRATOR_ROLE} IN SCHEMA public
       GRANT USAGE, SELECT ON SEQUENCES TO ${dml}`,
    // An application that cannot ALTER TABLE cannot switch its own row-level
    // security off.
    `REVOKE CREATE ON SCHEMA public FROM PUBLIC`,
    `REVOKE CREATE ON SCHEMA public FROM ${APP_ROLE}`,
    `REVOKE CREATE ON SCHEMA public FROM ${RECONCILER_ROLE}`,
    `REVOKE CREATE ON SCHEMA public FROM ${RUNNER_ROLE}`,

    // ADR-010. The claim functions' owner needs USAGE on the schema to resolve
    // `public.job`, and NOTHING else. It is granted no table privileges here:
    // the migration grants it SIX columns of ONE table, which is the entire
    // cross-tenant surface of this product.
    `GRANT USAGE ON SCHEMA public TO ${JOB_CLAIMER_ROLE}`,
    `REVOKE CREATE ON SCHEMA public FROM ${JOB_CLAIMER_ROLE}`,

    // Membership, so that `20260820150000_job_claim_boundary` can transfer the
    // functions to their owner. Membership alone would inherit the claimer's
    // policy, which is why that policy also tests `current_user` — verified in
    // `tests/integration/tenancy/job-claim-boundary.test.ts`.
    `GRANT ${JOB_CLAIMER_ROLE} TO ${MIGRATOR_ROLE}`,
  ];
}

function env(name: string, fallback: string): string {
  const value = process.env[name];
  return value === undefined || value === '' ? fallback : value;
}

/** The dev/CI defaults. Production supplies real secrets through the env. */
export function defaultRoleSpecs(): RoleSpec[] {
  return [
    { role: MIGRATOR_ROLE, password: env('DB_MIGRATOR_PASSWORD', 'connectbpm_migrator_dev'), createDb: true },
    { role: APP_ROLE, password: env('DB_APP_PASSWORD', 'connectbpm_app_dev'), createDb: false },
    { role: RECONCILER_ROLE, password: env('DB_RECONCILER_PASSWORD', 'connectbpm_reconciler_dev'), createDb: false },
    { role: RUNNER_ROLE, password: env('DB_RUNNER_PASSWORD', 'connectbpm_runner_dev'), createDb: false },
    { role: JOB_CLAIMER_ROLE, password: '', createDb: false, noLogin: true },
  ];
}

/** Exported so the test harness can provision without shelling out. */
export async function provisionRoles(adminUrl: string): Promise<string[]> {
  const prisma = new PrismaClient({ datasources: { db: { url: adminUrl } } });
  try {
    const [row] = await prisma.$queryRawUnsafe<Array<{ current_database: string }>>(
      'SELECT current_database()'
    );
    if (row === undefined) throw new Error('could not resolve current_database()');

    const specs = defaultRoleSpecs();
    const statements = [
      ...specs.flatMap(buildRoleStatements),
      ...buildGrantStatements(row.current_database),
    ];
    for (const statement of statements) await prisma.$executeRawUnsafe(statement);
    return specs.map((s) => s.role);
  } finally {
    await prisma.$disconnect();
  }
}

async function main(): Promise<void> {
  const adminUrl = process.env.ADMIN_DATABASE_URL ?? process.env.DATABASE_URL;
  if (adminUrl === undefined || adminUrl === '') {
    process.stderr.write('CANNOT RUN: set ADMIN_DATABASE_URL (an admin connection)\n');
    process.exit(2);
  }
  const roles = await provisionRoles(adminUrl);
  process.stdout.write(`provisioned ${roles.join(', ')} — all NOSUPERUSER NOBYPASSRLS\n`);
}

if (require.main === module) {
  main().catch((error: unknown) => {
    process.stderr.write(
      `CANNOT RUN: ${error instanceof Error ? error.message : String(error)}\n`
    );
    process.exit(2);
  });
}
