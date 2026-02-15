# QDB One: Implementation Task Graph

**Generated**: February 15, 2026
**CEO Direction**: Interface is prototype-level (not production UI)
**Total Phases**: 4 (Foundation → First Portal → Full Integration → Decommission)

---

## Phase 0: Foundation (Months 1-6)

### Sprint 0.1: Project Setup & Infrastructure Base (Weeks 1-2)

| Task ID | Task | Agent | Depends On | Parallel OK | Est. Days |
|---------|------|-------|-----------|-------------|-----------|
| SETUP-01 | Initialize monorepo structure (`products/qdb-one/`) with workspaces for hub services, subgraphs, and frontend shell | Backend | — | Yes | 1 |
| SETUP-02 | Set up Docker Compose for local development (Kafka, PostgreSQL, Redis, OpenSearch, Keycloak) | DevOps | — | Yes | 2 |
| SETUP-03 | Create CI/CD pipeline (lint, test, build, containerize) for the monorepo | DevOps | SETUP-01 | No | 2 |
| SETUP-04 | Set up port registry entries for QDB One (frontend 3110, API 5010, GraphQL 5011) | DevOps | — | Yes | 0.5 |

**Sprint Goal**: Developers can clone, `docker compose up`, and have a running local environment.

---

### Sprint 0.2: Master Person Index — Core (Weeks 3-6)

| Task ID | Task | Agent | Depends On | Parallel OK | Est. Days |
|---------|------|-------|-----------|-------------|-----------|
| MPI-01 | Create MPI PostgreSQL database schema (person, person_identity, organization, person_org_role, match_queue, merge_history, consent) | Backend | SETUP-01 | Yes | 2 |
| MPI-02 | Build MPI REST API — CRUD for person, organization, identity records | Backend | MPI-01 | No | 3 |
| MPI-03 | Build deterministic matching engine (QID, CR number, NAS ID exact match) | Backend | MPI-01 | Yes | 3 |
| MPI-04 | Build semi-deterministic matching (email + name, phone + CR combination) | Backend | MPI-03 | No | 2 |
| MPI-05 | Build golden record survivorship rules (field-level merge logic) | Backend | MPI-02 | No | 2 |
| MPI-06 | Build match queue API for Data Steward review (list pending, approve, reject with justification) | Backend | MPI-04 | No | 2 |
| MPI-07 | Write MPI integration tests (matching accuracy: 95%+ deterministic, 85%+ semi-deterministic) | QA | MPI-04, MPI-05 | No | 3 |

**Sprint Goal**: MPI can ingest identity records from multiple sources, match them deterministically by QID/CR, and produce golden records.

**Checkpoint**: MPI matches >95% of test records deterministically. CEO review.

---

### Sprint 0.3: Authentication — QDB Login (Weeks 5-8)

| Task ID | Task | Agent | Depends On | Parallel OK | Est. Days |
|---------|------|-------|-----------|-------------|-----------|
| AUTH-01 | Deploy and configure Keycloak (realm: qdb-one, NAS identity provider via SAML 2.0) | DevOps | SETUP-02 | Yes | 3 |
| AUTH-02 | Build NAS integration — SAML 2.0 IDP configuration, attribute mapping (QID, name_ar, name_en) | Backend | AUTH-01 | No | 3 |
| AUTH-03 | Build post-login MPI enrichment hook (QID → MPI lookup → persona injection into session) | Backend | AUTH-01, MPI-02 | No | 2 |
| AUTH-04 | Build QDB Foreign ID (QFI) system — QFI table, RM onboarding API, QFI+OTP login flow | Backend | AUTH-01 | Yes | 3 |
| AUTH-05 | Build identity linking flow — first-login detection, consent screen API, link/reject endpoints | Backend | AUTH-03, MPI-04 | No | 3 |
| AUTH-06 | Build manual account linking API (Settings → enter email/CR → OTP → verify → link) | Backend | AUTH-05 | No | 2 |
| AUTH-07 | Write auth integration tests (NAS login, QFI login, identity linking all 3 waves) | QA | AUTH-05, AUTH-06 | No | 3 |

**Sprint Goal**: Users can log in via NAS, receive a session with all linked personas, and link orphaned accounts.

---

### Sprint 0.4: Authorization — OpenFGA (Weeks 7-10)

| Task ID | Task | Agent | Depends On | Parallel OK | Est. Days |
|---------|------|-------|-----------|-------------|-----------|
| AUTHZ-01 | Deploy OpenFGA instance and configure store | DevOps | SETUP-02 | Yes | 1 |
| AUTHZ-02 | Implement authorization model (person, organization, loan_application, guarantee, advisory_session, document types with relations) | Backend | AUTHZ-01 | No | 3 |
| AUTHZ-03 | Build relationship tuple sync — when MPI links a person to an org/role, write tuples to OpenFGA | Backend | AUTHZ-02, MPI-02 | No | 2 |
| AUTHZ-04 | Build authorization middleware (check permissions on every API request using OpenFGA) | Backend | AUTHZ-02 | No | 2 |
| AUTHZ-05 | Build context switching API (change active persona/company, re-evaluate permissions) | Backend | AUTHZ-04 | No | 2 |
| AUTHZ-06 | Write authorization tests (multi-role scenarios, delegation, context switching, permission denial) | QA | AUTHZ-04, AUTHZ-05 | No | 3 |

**Sprint Goal**: Authorization enforces person-org-role relationships. Context switching between companies works.

---

### Sprint 0.5: Event Pipeline — Kafka + CDC (Weeks 9-12)

| Task ID | Task | Agent | Depends On | Parallel OK | Est. Days |
|---------|------|-------|-----------|-------------|-----------|
| EVENT-01 | Deploy Kafka cluster (3 brokers) + Kafka Connect + Schema Registry in Docker/K8s | DevOps | SETUP-02 | Yes | 3 |
| EVENT-02 | Configure Debezium PostgreSQL connector for MPI database CDC | DevOps | EVENT-01, MPI-01 | No | 2 |
| EVENT-03 | Define Kafka topic naming convention and event envelope schema (CloudEvents format) | Backend | EVENT-01 | Yes | 1 |
| EVENT-04 | Build event publisher library — shared module for portal apps to publish domain events to Kafka | Backend | EVENT-03 | No | 2 |
| EVENT-05 | Build stream processor framework — consumer base class with error handling, dead letter queue, idempotency | Backend | EVENT-01 | No | 3 |
| EVENT-06 | Write event pipeline integration tests (publish → consume → verify, DLQ on failure, idempotency) | QA | EVENT-04, EVENT-05 | No | 2 |

**Sprint Goal**: Kafka cluster running. Events can be published and consumed reliably. CDC captures MPI changes.

---

### Sprint 0.6: Unified Read Store + GraphQL Gateway (Weeks 11-14)

| Task ID | Task | Agent | Depends On | Parallel OK | Est. Days |
|---------|------|-------|-----------|-------------|-----------|
| READ-01 | Create Unified Read Store PostgreSQL schema (person_summary, org_summary, dashboard_items, activity_feed, notifications) | Backend | SETUP-01 | Yes | 2 |
| READ-02 | Build MPI projection service — consumes MPI CDC events, materializes person_summary and org_summary | Backend | READ-01, EVENT-05 | No | 3 |
| READ-03 | Deploy OpenSearch and configure Arabic analyzer | DevOps | SETUP-02 | Yes | 2 |
| READ-04 | Build search indexer — consumes events, updates OpenSearch index | Backend | READ-03, EVENT-05 | No | 2 |
| READ-05 | Deploy Apollo Router / GraphQL Federation gateway | DevOps | SETUP-02 | Yes | 2 |
| READ-06 | Build MPI subgraph (Person, Organization, Identity queries) | Backend | MPI-02, READ-05 | No | 2 |
| READ-07 | Build Dashboard subgraph (DashboardItem, ActionItem, ActivityFeed queries from Read Store) | Backend | READ-01, READ-05 | No | 2 |
| READ-08 | Build Notification subgraph (notifications queries, mark-read mutations) | Backend | READ-01, READ-05 | No | 1 |
| READ-09 | Write read store integration tests (event → projection → query, search accuracy) | QA | READ-02, READ-04, READ-07 | No | 3 |

**Sprint Goal**: Cross-portal dashboard data can be queried via GraphQL. Search across entities works.

---

### Sprint 0.7: Prototype Frontend Shell (Weeks 13-16)

| Task ID | Task | Agent | Depends On | Parallel OK | Est. Days |
|---------|------|-------|-----------|-------------|-----------|
| UI-01 | Set up Next.js shell application with Keycloak auth integration (login/logout/session) | Frontend | AUTH-01 | Yes | 2 |
| UI-02 | Build prototype dashboard page — fetch from Dashboard subgraph, display cards grouped by portal | Frontend | UI-01, READ-07 | No | 3 |
| UI-03 | Build prototype persona/company switcher — dropdown, context change triggers dashboard reload | Frontend | UI-02, AUTHZ-05 | No | 2 |
| UI-04 | Build prototype notification panel — fetch from Notification subgraph, display list, mark read | Frontend | UI-01, READ-08 | No | 2 |
| UI-05 | Build prototype unified search — search bar, query OpenSearch via GraphQL, display results with portal badges | Frontend | UI-01, READ-04 | No | 2 |
| UI-06 | Build prototype identity linking screens (first-login linking, manual link in settings) | Frontend | UI-01, AUTH-05, AUTH-06 | No | 2 |
| UI-07 | Build prototype admin panel — Data Steward match review queue (list, side-by-side, approve/reject) | Frontend | UI-01, MPI-06 | No | 2 |
| UI-08 | Add Arabic/English toggle with RTL support (basic — layout flip, hardcoded translations) | Frontend | UI-01 | Yes | 2 |

**Note**: All UI is **prototype-level** — functional, demonstrates the UX, but NOT production-polished. No design system, no pixel-perfect styling, no accessibility audit. Production UI comes later.

**Sprint Goal**: Working prototype showing unified dashboard, persona switching, search, notifications, and identity linking.

**Checkpoint**: Foundation complete. Full prototype demo to CEO. Testing gate must pass.

---

## Phase 1: First Portal Integration — Financing (Months 7-10)

### Sprint 1.1: Financing Data Integration (Weeks 17-20)

| Task ID | Task | Agent | Depends On | Parallel OK | Est. Days |
|---------|------|-------|-----------|-------------|-----------|
| FIN-01 | Configure Debezium Oracle connector for financing_core DB (customers, loans, applications tables) | DevOps | EVENT-01 | Yes | 3 |
| FIN-02 | Build Financing event publisher — add domain events to financing portal code (LoanApplicationSubmitted, LoanApproved, PaymentReceived) | Backend | EVENT-04 | No | 3 |
| FIN-03 | Build Financing projection service — consumes CDC + app events, materializes dashboard_items for loans/applications | Backend | FIN-01, FIN-02, READ-01 | No | 3 |
| FIN-04 | Build Financing GraphQL subgraph (LoanApplication, Loan, Payment queries — reads from financing_core DB) | Backend | READ-05 | No | 3 |
| FIN-05 | Register Financing subgraph with federation gateway | DevOps | FIN-04, READ-05 | No | 0.5 |
| FIN-06 | Build MPI identity enrichment for financing_core.customers (CDC → MPI matching by CR number) | Backend | FIN-01, MPI-03 | No | 2 |
| FIN-07 | Write Financing integration tests (CDC captures, event publishing, projection accuracy, subgraph queries) | QA | FIN-03, FIN-04, FIN-06 | No | 3 |

**Sprint Goal**: Financing data flows into the Unified Read Store and is queryable via GraphQL.

---

### Sprint 1.2: Financing Prototype UI + Dashboard (Weeks 21-24)

| Task ID | Task | Agent | Depends On | Parallel OK | Est. Days |
|---------|------|-------|-----------|-------------|-----------|
| FIN-UI-01 | Build prototype Financing overview page (`/financing`) — active loans, pending apps, balances | Frontend | FIN-04, UI-01 | No | 2 |
| FIN-UI-02 | Build prototype Applications list + detail pages (`/financing/applications`, `/financing/applications/:id`) | Frontend | FIN-04 | No | 3 |
| FIN-UI-03 | Build prototype Loan detail page (`/financing/loans/:id`) — balance, schedule, payments, related guarantees | Frontend | FIN-04 | No | 2 |
| FIN-UI-04 | Update dashboard to show real Financing cards (loans, apps from Financing subgraph) | Frontend | FIN-03, UI-02 | No | 1 |
| FIN-UI-05 | Add Financing results to unified search | Frontend | FIN-04, UI-05 | No | 1 |
| FIN-UI-06 | Wire Financing notifications (loan approved, payment due, application status change) | Backend | FIN-02, READ-08 | Yes | 2 |
| FIN-UI-07 | Write E2E tests for Financing prototype (login → dashboard → view loan → view application) | QA | FIN-UI-01 through FIN-UI-05 | No | 3 |

**Sprint Goal**: Working Financing section in the prototype. Dashboard shows real financing data.

---

### Sprint 1.3: Parallel-Run & Pilot (Weeks 25-28)

| Task ID | Task | Agent | Depends On | Parallel OK | Est. Days |
|---------|------|-------|-----------|-------------|-----------|
| PILOT-01 | Deploy QDB One to staging environment with Financing data connected | DevOps | FIN-07, FIN-UI-07 | No | 3 |
| PILOT-02 | Run parallel comparison — verify QDB One dashboard matches legacy Financing portal data for 50 test accounts | QA | PILOT-01 | No | 3 |
| PILOT-03 | MPI bulk linking — run deterministic matching (QID, CR) for all financing_core.customers against existing MPI records | Backend | PILOT-01, MPI-03 | No | 2 |
| PILOT-04 | Document discrepancies found during parallel-run, create fix tasks | QA | PILOT-02 | No | 2 |
| PILOT-05 | Fix discrepancies from parallel-run | Backend | PILOT-04 | No | 3 |

**Checkpoint**: Financing portal integrated. Pilot-ready. CEO review.

---

## Phase 2: Full Integration (Months 11-16)

### Sprint 2.1: Guarantee Portal Integration (Weeks 29-34)

| Task ID | Task | Agent | Depends On | Parallel OK | Est. Days |
|---------|------|-------|-----------|-------------|-----------|
| GUAR-01 | Configure Debezium Oracle connector for guarantee_main and guarantee_claims DBs | DevOps | EVENT-01 | Yes | 3 |
| GUAR-02 | Build Guarantee event publisher (GuaranteeCreated, GuaranteeSigned, ClaimFiled) | Backend | EVENT-04 | No | 2 |
| GUAR-03 | Build Guarantee projection service (dashboard_items for guarantees, pending signatures) | Backend | GUAR-01, GUAR-02, READ-01 | No | 3 |
| GUAR-04 | Build Guarantee GraphQL subgraph (Guarantee, Signature, Claim, Collateral) | Backend | READ-05 | No | 3 |
| GUAR-05 | Build digital signature flow — step-up auth (NAS redirect for high assurance), signature recording | Backend | GUAR-04, AUTH-02 | No | 4 |
| GUAR-06 | Build MPI identity enrichment for guarantee_main.signatories (CDC → MPI matching by QID) | Backend | GUAR-01, MPI-03 | No | 2 |
| GUAR-07 | Build prototype Guarantee UI pages (`/guarantees`, `/:id`, `/:id/sign`, `/pending`) | Frontend | GUAR-04, UI-01 | No | 4 |
| GUAR-08 | Write Guarantee integration + E2E tests | QA | GUAR-05, GUAR-07 | No | 3 |

---

### Sprint 2.2: Advisory Portal Integration (Weeks 33-38)

| Task ID | Task | Agent | Depends On | Parallel OK | Est. Days |
|---------|------|-------|-----------|-------------|-----------|
| ADV-01 | Configure Debezium PostgreSQL connector for advisory_main and advisory_assess DBs | DevOps | EVENT-01 | Yes | 2 |
| ADV-02 | Build Advisory event publisher (SessionBooked, AssessmentCompleted, ProgramEnrolled) | Backend | EVENT-04 | No | 2 |
| ADV-03 | Build Advisory projection service (dashboard_items for sessions, programs) | Backend | ADV-01, ADV-02, READ-01 | No | 2 |
| ADV-04 | Build Advisory GraphQL subgraph (Program, Session, Assessment) | Backend | READ-05 | No | 3 |
| ADV-05 | Build MPI identity enrichment for advisory_main.users (CDC → MPI matching by email) | Backend | ADV-01, MPI-04 | No | 2 |
| ADV-06 | Build prototype Advisory UI pages (`/advisory`, `/programs/:id`, `/sessions/:id`) | Frontend | ADV-04, UI-01 | No | 3 |
| ADV-07 | Write Advisory integration + E2E tests | QA | ADV-04, ADV-06 | No | 2 |

**Note**: Sprints 2.1 and 2.2 can run **in parallel** — Guarantee and Advisory have no dependencies on each other.

---

### Sprint 2.3: Cross-Portal Features (Weeks 37-42)

| Task ID | Task | Agent | Depends On | Parallel OK | Est. Days |
|---------|------|-------|-----------|-------------|-----------|
| CROSS-01 | Build cross-portal linking — loan shows related guarantees, guarantee shows related loans (via CR/org_id) | Backend | FIN-04, GUAR-04 | No | 3 |
| CROSS-02 | Build Document Center subgraph (aggregates documents from all portals) | Backend | FIN-04, GUAR-04, ADV-04 | No | 3 |
| CROSS-03 | Build unified activity feed projection (all actions across portals in chronological order) | Backend | FIN-03, GUAR-03, ADV-03 | No | 2 |
| CROSS-04 | Build prototype cross-portal linking UI (related items section on loan/guarantee/advisory detail pages) | Frontend | CROSS-01, UI-01 | No | 3 |
| CROSS-05 | Build prototype Document Center UI (`/documents`, `/documents/:id`, upload) | Frontend | CROSS-02, UI-01 | No | 2 |
| CROSS-06 | Build prototype Activity Feed on dashboard | Frontend | CROSS-03, UI-02 | No | 1 |
| CROSS-07 | Full cross-portal E2E tests (navigate loan → guarantee → advisory, search, notifications across all portals) | QA | CROSS-04, CROSS-05, CROSS-06 | No | 4 |

**Checkpoint**: All portals integrated. Full cross-portal dashboard operational. CEO review.

---

## Phase 3: Legacy Decommission (Months 17-18+)

### Sprint 3.1: Migration & Sunset (Weeks 43-48)

| Task ID | Task | Agent | Depends On | Parallel OK | Est. Days |
|---------|------|-------|-----------|-------------|-----------|
| SUNSET-01 | Run MPI bulk matching for all remaining unlinked records across all portals | Backend | Phase 2 complete | No | 3 |
| SUNSET-02 | Add "Switch to QDB Login" banner to legacy portal logins | Frontend | Phase 2 complete | Yes | 1 |
| SUNSET-03 | Monitor parallel-run metrics (error rate, data accuracy, user adoption) for 3 months | QA | Phase 2 complete | Yes | Ongoing |
| SUNSET-04 | Disable legacy login endpoints for new sessions | DevOps | SUNSET-03 (3 months elapsed) | No | 1 |
| SUNSET-05 | Set legacy portals to read-only mode | DevOps | SUNSET-04 | No | 1 |
| SUNSET-06 | Archive legacy databases (backup, verify, document retention policy) | DevOps | SUNSET-05 | No | 3 |
| SUNSET-07 | Decommission legacy portal infrastructure | DevOps | SUNSET-06 | No | 2 |
| SUNSET-08 | Final audit report — data integrity verification, compliance sign-off | QA | SUNSET-07 | No | 3 |

**Checkpoint**: Legacy decommissioned. Final CEO sign-off.

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Total tasks | 78 |
| Phase 0 (Foundation) tasks | 41 |
| Phase 1 (Financing) tasks | 19 |
| Phase 2 (Full Integration) tasks | 22 |
| Phase 3 (Decommission) tasks | 8 |
| Checkpoints (CEO review) | 4 |
| Backend tasks | 38 |
| Frontend tasks (prototype) | 15 |
| DevOps tasks | 15 |
| QA tasks | 14 |

### Parallel Execution Opportunities

| Phase | Parallel Groups |
|-------|----------------|
| Phase 0 | Sprint 0.2 (MPI) + Sprint 0.3 (Auth) can overlap. Sprint 0.4 (AuthZ) + Sprint 0.5 (Events) can overlap. |
| Phase 1 | Sprint 1.1 (data) + Sprint 1.2 (UI) partially overlap after FIN-04 completes. |
| Phase 2 | Sprint 2.1 (Guarantee) + Sprint 2.2 (Advisory) run **fully in parallel**. |

### Critical Path

```
SETUP-01 → MPI-01 → MPI-03 → AUTH-03 → AUTH-05 → EVENT-01 → READ-01 → READ-02
→ FIN-01 → FIN-03 → FIN-UI-04 → PILOT-01 → PILOT-02
→ GUAR-01 + ADV-01 (parallel) → CROSS-01 → CROSS-07
→ SUNSET-03 (3 months) → SUNSET-07
```

**Critical path duration**: ~16 months to full integration + 3 months parallel-run = 19 months total.

### Frontend Prototype Scope

All frontend tasks (UI-01 through UI-08, FIN-UI-01 through FIN-UI-07, GUAR-07, ADV-06, CROSS-04 through CROSS-06) produce **prototype-level interfaces**:

- Functional and demonstrable
- Uses basic component library (e.g., Ant Design, Chakra UI, or plain Tailwind)
- No custom QDB design system (that's a Phase 2+ effort)
- No pixel-perfect styling or brand polish
- No full accessibility audit (WCAG compliance deferred)
- No production-grade i18n (basic AR/EN toggle only)
- Demonstrates all UX flows end-to-end
- Good enough for pilot users and CEO demos

**Production UI** will be a separate workstream once the prototype is validated.
