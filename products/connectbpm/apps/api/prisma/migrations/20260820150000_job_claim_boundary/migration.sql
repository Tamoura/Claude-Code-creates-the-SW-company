-- ============================================================================
-- The cross-tenant job-claim boundary.        ADR-010 · ARCH-02
--   amends ADR-004 §3 (RLS is mandatory) and ADR-009 (the claim loop)
--
-- THE PROBLEM THIS FIXES, observed on a live database before it was written:
--
--   2 PENDING jobs planted, one per tenant (as superuser)
--     as connectbpm_app      (the runner), no tenant context : 0 rows claimed
--     as connectbpm_migrator (the table OWNER)               : 0 rows
--     as connectbpm_app      with app.tenant_id set          : 1 row, own tenant
--
--   ADR-009's runner claims due jobs with ONE cross-tenant
--   `SELECT ... FOR UPDATE SKIP LOCKED`. ADR-004 §3 put ENABLE + FORCE row
--   level security on `job`. Under that policy the claim query matches nothing
--   and reports success. No error, no log — timers simply never fire, and the
--   engine looks healthy. That is the worst failure shape available.
--
-- WHAT THIS MIGRATION DOES NOT DO
--
--   It does not grant BYPASSRLS to anything. It does not weaken, branch or
--   touch `tenant_isolation` — that policy is still one unconditional equality
--   on all 27 tables, and a policy with no branch in it cannot fail open.
--   It does not move `job` out of the tenant-scoped set: `job.payload` carries
--   outbox bodies, which are tenant CONTENT, and un-scoping the table would
--   also stop `withTenant` stamping `tenant_id` on the outbox row a transition
--   enqueues (ADR-004 §5, AC-056).
--
-- WHAT IT DOES
--
--   It adds ONE principal that can see FOUR facts about jobs in TWO states
--   across tenants, reachable ONLY from inside two fixed function bodies.
--
--   `connectbpm_job_claimer`  NOLOGIN, NOSUPERUSER, NOBYPASSRLS.
--                             Owns the two functions below and nothing else.
--                             Nothing can connect as it. The only way to
--                             execute with its identity is to call a
--                             SECURITY DEFINER function it owns, and only
--                             `connectbpm_migrator` can replace those.
--
--   Two ADDITIVE policies on `job` alone, each an unconditional conjunction:
--
--     current_user = 'connectbpm_job_claimer'  AND  status IN (PENDING, CLAIMED)
--
--   The first conjunct is load-bearing and is the reason this is not the
--   "role-aware policy" option. `TO connectbpm_job_claimer` alone would also
--   match every MEMBER of that role — and `connectbpm_migrator` must be a
--   member in order to transfer ownership of the functions to it. Membership
--   is enough to inherit a policy; it was verified that without this conjunct
--   the migrator sees every tenant's jobs. `current_user` inside a
--   SECURITY DEFINER function is the OWNER, so the conjunct admits the function
--   and excludes every session, including the migrator's own. Both conjuncts
--   only ever NARROW. If either were wrong the result is zero rows claimed —
--   the loud-in-the-gate, closed failure — never a row of another tenant's.
--
--   Column-level privileges make the reach smaller than the policy:
--     SELECT (id, tenant_id, run_at, status, attempts, locked_until)
--     UPDATE (status, locked_by, locked_until, attempts, updated_at)
--   The claimer cannot NAME `payload`, `dedupe_key`, `element_id`,
--   `instance_id`, `token_id`, `token_version` or `last_error`, and cannot
--   write `tenant_id`. A future edit of the function body that tried to read a
--   payload across tenants does not compile in the database.
--
--   The functions are EXECUTE-able only by `connectbpm_runner`. The API role
--   `connectbpm_app` is deliberately not granted: a bug on the HTTP surface
--   must not be able to mark every tenant's timers CLAIMED and suppress the
--   engine globally.
--
-- WHAT THE RUNNER DOES WITH THE RESULT (ADR-009, P2)
--
--   The functions return job IDs and their tenant IDs and NOTHING else. The
--   runner then enters `withTenant(tenantId)` per job and executes it there,
--   under the ordinary `tenant_isolation` policy, through the ordinary branded
--   `TenantScopedClient`. Cross-tenant reach ends at the function boundary;
--   every read, every write, every evidence entry and every usage event
--   happens tenant-scoped. DEC-002 MET-2 is untouched, because the meter is in
--   the same transaction as the STATE TRANSITION, and a lease is not a state
--   transition.
--
-- PREREQUISITE: `pnpm --filter @connectbpm/api db:roles` must have run, as it
-- must for every migration since ADR-004 §3. It creates `connectbpm_runner`
-- and `connectbpm_job_claimer` and makes the migrator a member of the latter.
-- ============================================================================

-- ─── 1. The two additive policies on `job` ──────────────────────────────────

DROP POLICY IF EXISTS job_claimer_read ON "job";
CREATE POLICY job_claimer_read ON "job"
  AS PERMISSIVE FOR SELECT TO connectbpm_job_claimer
  USING (
    current_user = 'connectbpm_job_claimer'
    AND status IN ('PENDING'::"JobStatus", 'CLAIMED'::"JobStatus")
  );

DROP POLICY IF EXISTS job_claimer_lease ON "job";
CREATE POLICY job_claimer_lease ON "job"
  AS PERMISSIVE FOR UPDATE TO connectbpm_job_claimer
  USING (
    current_user = 'connectbpm_job_claimer'
    AND status IN ('PENDING'::"JobStatus", 'CLAIMED'::"JobStatus")
  )
  WITH CHECK (
    current_user = 'connectbpm_job_claimer'
    AND status IN ('PENDING'::"JobStatus", 'CLAIMED'::"JobStatus")
  );

-- No INSERT policy and no DELETE policy. The claimer can only move a job
-- between PENDING and CLAIMED; it can neither create a job nor destroy one.

-- ─── 2. Column-level privileges ─────────────────────────────────────────────

REVOKE ALL ON TABLE "job" FROM connectbpm_job_claimer;
GRANT SELECT (id, tenant_id, run_at, status, attempts, locked_until)
  ON "job" TO connectbpm_job_claimer;
GRANT UPDATE (status, locked_by, locked_until, attempts, updated_at)
  ON "job" TO connectbpm_job_claimer;

-- ─── 3. The indexes the two functions actually need ─────────────────────────
-- ADR-009 declares the partial index but Prisma cannot express a predicate, so
-- it was never created; the non-partial `job_run_at_id_idx` Prisma generates
-- stays because the schema declares it (removing it would be migration drift).
-- The partial index is what keeps the poll flat as DONE rows accumulate, which
-- is the NFR-004 property.

CREATE INDEX IF NOT EXISTS "job_due_pending_idx"
  ON "job" ("run_at", "id") WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS "job_lease_expiry_idx"
  ON "job" ("locked_until") WHERE status = 'CLAIMED';

-- ─── 4. The claim function ──────────────────────────────────────────────────
-- `SET search_path = pg_catalog` and fully qualified names: a SECURITY DEFINER
-- function that resolves names through the caller's search_path is a privilege
-- escalation, and the app role holds no CREATE on schema public precisely so
-- that it cannot plant a shadowing object anyway.

CREATE OR REPLACE FUNCTION public.app_claim_due_jobs(
  p_worker     text,
  p_batch      integer,
  p_tenant_cap integer,
  p_lease_secs integer DEFAULT 60
) RETURNS TABLE (job_id uuid, tenant_id uuid)
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog
AS $fn$
  -- `due` both BOUNDS THE SCAN and TAKES THE LOCKS, in that one query level.
  --
  -- Both properties are load-bearing and the ordering of them was got wrong
  -- once, so it is written down. `FOR UPDATE SKIP LOCKED` must sit in the same
  -- query level as the `LIMIT`, because that is what makes the limit count only
  -- rows this worker actually took: worker 1 locks the first window, worker 2
  -- SKIPS those and locks the next one, and the two windows are disjoint. Move
  -- the lock to a later CTE over a candidate set that was already fixed, and
  -- both workers choose the SAME candidates, one of them skips all of them and
  -- claims nothing — measured: w1 = 0 rows, w2 = 30 rows. Correct, and 1/Nth of
  -- the throughput J1 needs.
  --
  -- The 4x oversample is the room per-tenant fairness needs to trim in. Rows
  -- locked and then trimmed are released when this statement commits, which is
  -- milliseconds later, and are due again on the next poll.
  WITH due AS (
    SELECT j.id, j.tenant_id, j.run_at
      FROM public.job j
     WHERE j.status = 'PENDING'::public."JobStatus"
       AND j.run_at <= now()
     ORDER BY j.run_at, j.id
     LIMIT greatest(p_batch, 1) * 4
     FOR UPDATE SKIP LOCKED
  ),
  -- ADR-009's per-tenant fairness. One tenant's 50,000-timer midnight burst
  -- takes at most p_tenant_cap slots of a batch, so a batch under a
  -- single-tenant burst is DELIBERATELY smaller than p_batch. That is the
  -- ceiling doing its job, not the query underperforming.
  fair AS (
    SELECT s.id
      FROM (
        SELECT d.id,
               row_number() OVER (PARTITION BY d.tenant_id ORDER BY d.run_at, d.id) AS rn
          FROM due d
      ) s
     WHERE s.rn <= greatest(p_tenant_cap, 1)
     LIMIT greatest(p_batch, 1)
  )
  UPDATE public.job j
     SET status       = 'CLAIMED'::public."JobStatus",
         locked_by    = p_worker,
         locked_until = now() + make_interval(secs => greatest(p_lease_secs, 1)),
         attempts     = j.attempts + 1,
         updated_at   = now()
    FROM fair f
   WHERE j.id = f.id
  RETURNING j.id, j.tenant_id;
$fn$;

COMMENT ON FUNCTION public.app_claim_due_jobs(text,integer,integer,integer) IS
  'ADR-010. The ONLY cross-tenant reach in this schema. Returns job ids and their tenant ids; the runner then enters withTenant(tenantId) per job to execute it. Owned by connectbpm_job_claimer (NOLOGIN, NOBYPASSRLS); EXECUTE granted to connectbpm_runner only.';

-- ─── 5. The lease reaper ────────────────────────────────────────────────────
-- A worker that is SIGKILLed mid-job leaves its rows CLAIMED. Without this the
-- claim function is only half a mechanism: those jobs never run again and the
-- failure is, once more, silent. `attempts` is NOT incremented here — it was
-- already incremented at claim time, so a crash loop is bounded.

CREATE OR REPLACE FUNCTION public.app_reap_expired_job_leases(
  p_limit integer DEFAULT 500
) RETURNS TABLE (job_id uuid, tenant_id uuid)
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog
AS $fn$
  WITH expired AS (
    SELECT j.id
      FROM public.job j
     WHERE j.status = 'CLAIMED'::public."JobStatus"
       AND j.locked_until < now()
     ORDER BY j.locked_until
     LIMIT greatest(p_limit, 1)
     FOR UPDATE SKIP LOCKED
  )
  UPDATE public.job j
     SET status       = 'PENDING'::public."JobStatus",
         locked_by    = NULL,
         locked_until = NULL,
         updated_at   = now()
    FROM expired e
   WHERE j.id = e.id
  RETURNING j.id, j.tenant_id;
$fn$;

COMMENT ON FUNCTION public.app_reap_expired_job_leases(integer) IS
  'ADR-010. Returns a crashed worker''s jobs to PENDING. Every handler is idempotent under the token-version guard (ADR-009 J2), so a double-claim produces one effect.';

-- ─── 6. Ownership and execute privileges ────────────────────────────────────
-- Transferring ownership requires the new owner to hold CREATE on the schema.
-- It is granted for exactly these two statements and revoked immediately: the
-- claimer must not be able to create anything, ever.

GRANT CREATE ON SCHEMA public TO connectbpm_job_claimer;
ALTER FUNCTION public.app_claim_due_jobs(text,integer,integer,integer)
  OWNER TO connectbpm_job_claimer;
ALTER FUNCTION public.app_reap_expired_job_leases(integer)
  OWNER TO connectbpm_job_claimer;
REVOKE CREATE ON SCHEMA public FROM connectbpm_job_claimer;

REVOKE ALL ON FUNCTION public.app_claim_due_jobs(text,integer,integer,integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_reap_expired_job_leases(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.app_claim_due_jobs(text,integer,integer,integer)
  TO connectbpm_runner;
GRANT EXECUTE ON FUNCTION public.app_reap_expired_job_leases(integer)
  TO connectbpm_runner;
