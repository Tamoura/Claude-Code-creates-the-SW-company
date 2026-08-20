/**
 * The role DDL, asserted without a database.   ADR-004 §3 · ADR-010 · NFR-008
 *
 * `provision-db-roles.ts` says of itself: "Exported so it can be asserted on
 * without a database: the NOSUPERUSER / NOBYPASSRLS clauses ARE the second
 * isolation layer, and a silent regression here would disable it everywhere
 * while every other test still passed." Nothing asserted on it until ARCH-02.
 *
 * That is the same shape as the bug ARCH-02 was raised to fix: a protection
 * everyone believed was present, that nothing checked, whose absence produced
 * no error. `rls-enforcement.test.ts` covers the posture of the roles that
 * exist in the test database; these tests cover the DDL that CREATES them, so
 * a regression fails on a laptop with no PostgreSQL running.
 */
import {
  APP_ROLE,
  JOB_CLAIMER_ROLE,
  MIGRATOR_ROLE,
  RECONCILER_ROLE,
  RUNNER_ROLE,
  assertSafePassword,
  buildGrantStatements,
  buildRoleStatements,
  defaultRoleSpecs,
} from '../../../scripts/provision-db-roles';

const LOGIN_ROLES = [APP_ROLE, MIGRATOR_ROLE, RECONCILER_ROLE, RUNNER_ROLE];

describe('[ADR-004 §3][NFR-008] every provisioned role is NOSUPERUSER and NOBYPASSRLS', () => {
  it.each(defaultRoleSpecs())('$role is stripped of both exemptions', (spec) => {
    const ddl = buildRoleStatements(spec).join('\n');

    // These two words are the second isolation layer. FORCE ROW LEVEL SECURITY
    // binds the table owner, but nothing binds a superuser or a BYPASSRLS role.
    expect(ddl).toContain('NOSUPERUSER');
    expect(ddl).toContain('NOBYPASSRLS');
    expect(ddl).toContain('NOCREATEROLE');
    // Asserted on EVERY run, not only at creation: a role altered by hand in an
    // incident must be put back by the next provisioning run.
    expect(ddl).toContain(`ALTER ROLE ${spec.role} `);
  });

  it('provisions exactly the five roles the README documents', () => {
    expect(defaultRoleSpecs().map((s) => s.role).sort()).toEqual(
      [APP_ROLE, JOB_CLAIMER_ROLE, MIGRATOR_ROLE, RECONCILER_ROLE, RUNNER_ROLE].sort()
    );
  });

  it('only the migrator may CREATEDB — the rest have no reason to', () => {
    for (const spec of defaultRoleSpecs()) {
      const ddl = buildRoleStatements(spec).join('\n');
      expect(ddl).toContain(spec.role === MIGRATOR_ROLE ? 'CREATEDB' : 'NOCREATEDB');
    }
  });
});

describe('[ADR-010] the claim function owner cannot be connected to', () => {
  const claimer = defaultRoleSpecs().find((s) => s.role === JOB_CLAIMER_ROLE);
  if (claimer === undefined) throw new Error(`${JOB_CLAIMER_ROLE} is not provisioned at all`);

  it('is declared NOLOGIN', () => {
    expect(claimer.noLogin).toBe(true);
  });

  it('its DDL grants no LOGIN and sets no password', () => {
    const ddl = buildRoleStatements(claimer).join('\n');

    // The entire confinement of the cross-tenant boundary: there is no session
    // in which this role is current_user except one a SECURITY DEFINER function
    // it owns has opened. A LOGIN role would make that boundary decorative.
    expect(ddl).toContain('NOLOGIN');
    expect(ddl).not.toMatch(/\bLOGIN PASSWORD\b/);
    expect(ddl).not.toContain('PASSWORD');
  });

  it('every OTHER role does get LOGIN and a password', () => {
    for (const spec of defaultRoleSpecs().filter((s) => LOGIN_ROLES.includes(s.role))) {
      const ddl = buildRoleStatements(spec).join('\n');
      expect(ddl).toContain('LOGIN PASSWORD');
    }
  });
});

describe('[ADR-004 §3] a password that cannot be made safe is REFUSED, not escaped', () => {
  it.each([
    ["' OR 1=1 --", 'quote terminates the literal'],
    ['short', 'below the minimum length'],
    ['', 'empty'],
    ['pa;ssword;drop', 'statement separator'],
    ['x'.repeat(129), 'above the maximum length'],
  ])('refuses %p (%s)', (password) => {
    expect(() => assertSafePassword(APP_ROLE, password)).toThrow(/Refusing to provision/);
  });

  it('accepts the permitted character set', () => {
    expect(() => assertSafePassword(APP_ROLE, 'A-safe_password.1~2')).not.toThrow();
  });
});

describe('[ADR-004 §3][ADR-010] the grant statements', () => {
  const grants = buildGrantStatements('connectbpm_test').join('\n');

  it('gives DML to app, reconciler and runner — and never DDL', () => {
    expect(grants).toContain(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${APP_ROLE}, ${RECONCILER_ROLE}, ${RUNNER_ROLE}`
    );
  });

  it('revokes CREATE from every non-owning role, so none can disable its own RLS', () => {
    // An application that cannot ALTER TABLE cannot switch row-level security
    // off on the table it is being filtered by.
    for (const role of [APP_ROLE, RECONCILER_ROLE, RUNNER_ROLE, JOB_CLAIMER_ROLE]) {
      expect(grants).toContain(`REVOKE CREATE ON SCHEMA public FROM ${role}`);
    }
    expect(grants).toContain('REVOKE CREATE ON SCHEMA public FROM PUBLIC');
  });

  it('sets default privileges, so a FUTURE migration cannot forget to grant', () => {
    expect(grants).toContain('ALTER DEFAULT PRIVILEGES');
  });

  it('gives the claim owner USAGE on the schema and NOTHING on any table', () => {
    expect(grants).toContain(`GRANT USAGE ON SCHEMA public TO ${JOB_CLAIMER_ROLE}`);
    // Its table privileges are six columns of `job`, granted by the migration
    // and asserted by check-rls check E. Nothing table-shaped is granted here.
    const tableGrants = grants
      .split('\n')
      .filter((line) => line.includes('ON ALL TABLES') || line.includes('ON TABLES'));
    for (const line of tableGrants) expect(line).not.toContain(JOB_CLAIMER_ROLE);
  });

  it('makes the migrator a member of the claimer, so the migration can transfer ownership', () => {
    // Membership alone would INHERIT the claimer's policy — measured: without
    // the `current_user` conjunct in that policy the migrator saw every
    // tenant's jobs. The conjunct is in the migration; this grant is why it has
    // to be (ADR-010).
    expect(grants).toContain(`GRANT ${JOB_CLAIMER_ROLE} TO ${MIGRATOR_ROLE}`);
  });
});
