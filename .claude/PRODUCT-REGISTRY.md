# ConnectSW Product Registry

**Purpose**: Single source of truth for all ConnectSW products — maturity tier, stack, ports, CI, and docs.

**Last Updated**: 2026-03-05

---

## Product Maturity Tiers

| Tier | Meaning |
|------|---------|
| **Concept** | Idea documented, no production code yet |
| **Prototype** | Code exists, not feature-complete or production-viable |
| **Development** | Active development, feature-incomplete |
| **Active** | Feature-complete, production-ready, maintained |
| **Archived** | Deprecated, no longer maintained (see `products/archived/`) |

---

## Product Roster

### Active Tier

#### `stablecoin-gateway`
| Field | Value |
|-------|-------|
| **Description** | Institutional stablecoin payment gateway with security-audited API, SDK, and merchant demo |
| **Tier** | Active |
| **Stack** | Fastify + Next.js + PostgreSQL + Redis |
| **Frontend** | 3104 |
| **Backend** | 5001 |
| **Mobile** | — |
| **CI** | `.github/workflows/test-stablecoin-gateway.yml` |
| **PRD** | `products/stablecoin-gateway/docs/` |
| **Specs** | — |
| **Has Backend** | Yes |
| **Has Mobile** | No |
| **Notes** | Most mature product; includes merchant demo app and JS SDK |

#### `connectin`
| Field | Value |
|-------|-------|
| **Description** | AI-native, Arabic-first professional networking platform |
| **Tier** | Active |
| **Stack** | Fastify + Next.js + PostgreSQL |
| **Frontend** | 3111 |
| **Backend** | 5007 |
| **Mobile** | — |
| **CI** | `.github/workflows/connectin-ci.yml` |
| **PRD** | `products/connectin/docs/PRD.md` |
| **Specs** | `products/connectin/docs/` |
| **Has Backend** | Yes |
| **Has Mobile** | No |
| **Notes** | RTL/Arabic-first; multiple audit reports completed; most audited product |

---

### Development Tier

#### `connectgrc`
| Field | Value |
|-------|-------|
| **Description** | AI-native GRC talent platform — skill assessments, career development, job matching |
| **Tier** | Development |
| **Stack** | Fastify + Next.js + PostgreSQL |
| **Frontend** | 3110 |
| **Backend** | 5006 |
| **Mobile** | — |
| **CI** | `.github/workflows/connectgrc-ci.yml` |
| **PRD** | `products/connectgrc/docs/PRD.md` |
| **Specs** | `products/connectgrc/docs/specs/` |
| **Has Backend** | Yes |
| **Has Mobile** | No |
| **Notes** | Full spec-kit pipeline (spec, plan, tasks); 6 GRC domains |

#### `ai-fluency`
| Field | Value |
|-------|-------|
| **Description** | Enterprise AI Fluency Assessment and Development Platform — 4D AI Fluency Framework |
| **Tier** | Development |
| **Stack** | Fastify + Next.js + PostgreSQL |
| **Frontend** | 3118 |
| **Backend** | 5014 |
| **Mobile** | — |
| **CI** | `.github/workflows/ai-fluency-ci.yml` |
| **PRD** | `products/ai-fluency/docs/PRD.md` |
| **Specs** | `products/ai-fluency/docs/` |
| **Has Backend** | Yes |
| **Has Mobile** | No |
| **Notes** | Spec consistency gate active; quality-reports/ folder populated |

#### `archforge`
| Field | Value |
|-------|-------|
| **Description** | AI-first enterprise architecture platform — architecture decision generation and management |
| **Tier** | Development |
| **Stack** | Fastify + Next.js + PostgreSQL |
| **Frontend** | 3116 |
| **Backend** | 5012 |
| **Mobile** | — |
| **CI** | `.github/workflows/archforge-ci.yml` |
| **PRD** | `products/archforge/docs/` |
| **Specs** | — |
| **Has Backend** | Yes |
| **Has Mobile** | No |
| **Notes** | Has E2E tests; docker-compose present |

#### `humanid`
| Field | Value |
|-------|-------|
| **Description** | Decentralized digital identity standard — 8 billion people, one identity, zero central control |
| **Tier** | Development |
| **Stack** | Fastify + Next.js + PostgreSQL |
| **Frontend** | 3117 |
| **Backend** | 5013 |
| **Mobile** | — |
| **CI** | `.github/workflows/humanid-ci.yml` |
| **PRD** | `products/humanid/docs/` |
| **Specs** | — |
| **Has Backend** | Yes |
| **Has Mobile** | No |
| **Notes** | docker-compose present |

#### `recomengine`
| Field | Value |
|-------|-------|
| **Description** | B2B SaaS product recommendation platform — collaborative filtering, A/B testing, embeddable widgets |
| **Tier** | Development |
| **Stack** | Fastify + Next.js + PostgreSQL |
| **Frontend** | 3112 |
| **Backend** | 5008 |
| **Mobile** | — |
| **CI** | `.github/workflows/recomengine-ci.yml` |
| **PRD** | `products/recomengine/docs/` |
| **Specs** | — |
| **Has Backend** | Yes |
| **Has Mobile** | No |
| **Notes** | Includes JS SDK (`apps/sdk/`); has E2E tests |

#### `command-center`
| Field | Value |
|-------|-------|
| **Description** | Internal operations hub for managing the ConnectSW product portfolio |
| **Tier** | Development |
| **Stack** | Fastify + Next.js |
| **Frontend** | 3113 |
| **Backend** | 5009 |
| **Mobile** | — |
| **CI** | `.github/workflows/command-center-ci.yml` |
| **PRD** | `products/command-center/docs/` |
| **Specs** | — |
| **Has Backend** | Yes |
| **Has Mobile** | No |
| **Notes** | Internal tool; has E2E tests |

#### `linkedin-agent`
| Field | Value |
|-------|-------|
| **Description** | AI-powered LinkedIn content assistant — trend analysis, Arabic/English post generation |
| **Tier** | Development |
| **Stack** | Fastify + Next.js |
| **Frontend** | 3114 |
| **Backend** | 5010 |
| **Mobile** | — |
| **CI** | `.github/workflows/linkedin-agent-ci.yml` |
| **PRD** | `products/linkedin-agent/docs/` |
| **Specs** | — |
| **Has Backend** | Yes |
| **Has Mobile** | No |
| **Notes** | AI-heavy; Arabic + English output; has E2E tests |

#### `muaththir`
| Field | Value |
|-------|-------|
| **Description** | Influential Arabic content platform with analytics |
| **Tier** | Development |
| **Stack** | Fastify + Next.js + PostgreSQL |
| **Frontend** | 3108 |
| **Backend** | 5005 |
| **Mobile** | — |
| **CI** | `.github/workflows/muaththir-ci.yml` |
| **PRD** | `products/muaththir/docs/` |
| **Specs** | — |
| **Has Backend** | Yes |
| **Has Mobile** | No |
| **Notes** | Arabic-primary; RTL support required |

#### `qdb-one`
| Field | Value |
|-------|-------|
| **Description** | Enterprise integration platform unifying Qatar Development Bank's three portals |
| **Tier** | Development |
| **Stack** | Next.js + PostgreSQL (frontend-only; proxies QDB APIs) |
| **Frontend** | 3102 |
| **Backend** | — (frontend-only) |
| **Mobile** | — |
| **CI** | `.github/workflows/qdb-one-ci.yml` |
| **PRD** | `products/qdb-one/docs/PRD.md` |
| **Specs** | — |
| **Has Backend** | No (intentional — proxies existing QDB APIs) |
| **Has Mobile** | No |
| **Notes** | No dedicated backend by design; integrates QDB's existing Direct Financing, Advisory, and Guarantees APIs |

#### `qdb-sme-relief`
| Field | Value |
|-------|-------|
| **Description** | Emergency financing portal for Qatari SMEs affected by geopolitical disruption |
| **Tier** | Development |
| **Stack** | Next.js (frontend-only; lightweight serverless backend) |
| **Frontend** | 3119 |
| **Backend** | — (frontend-only) |
| **Mobile** | — |
| **CI** | — (not yet configured) |
| **PRD** | `products/qdb-sme-relief/docs/` |
| **Specs** | — |
| **Has Backend** | No |
| **Has Mobile** | No |
| **Notes** | Urgent-use portal; minimal stack intentional; CI needed |

---

### Prototype Tier

#### `quantum-computing-usecases`
| Field | Value |
|-------|-------|
| **Description** | Interactive quantum computing use case explorer |
| **Tier** | Prototype |
| **Stack** | Vite + React |
| **Frontend** | 3100 |
| **Backend** | — |
| **Mobile** | — |
| **CI** | `.github/workflows/quantum-computing-usecases-ci.yml` |
| **PRD** | — |
| **Specs** | — |
| **Has Backend** | No |
| **Has Mobile** | No |
| **Notes** | Frontend-only exploration; no backend required |

---

### Concept Tier

#### `codeguardian`
| Field | Value |
|-------|-------|
| **Description** | Multi-model AI code review platform routing security, logic, and style checks to specialist models |
| **Tier** | Concept |
| **Stack** | Fastify + Next.js + PostgreSQL (planned) |
| **Frontend** | 3115 (reserved) |
| **Backend** | 5011 (reserved) |
| **Mobile** | — |
| **CI** | `.github/workflows/codeguardian-ci.yml` (disabled — no code yet) |
| **PRD** | `products/codeguardian/docs/` |
| **Specs** | — |
| **Has Backend** | No |
| **Has Mobile** | No |
| **Notes** | Pitch deck and showcase exist; ports reserved; CI disabled until scaffolding begins |

---

## Adding a New Product

When creating a new product, follow this checklist:

1. [ ] CEO brief captured in `notes/ceo/`
2. [ ] Business Analysis (BA-01) completed
3. [ ] Spec created (`/speckit.specify`)
4. [ ] Spec clarified (`/speckit.clarify`)
5. [ ] Ports assigned in `PORT-REGISTRY.md`
6. [ ] Product entry added to this registry
7. [ ] Foundation scaffolded (via `connectsw-create` CLI or manual)
8. [ ] CI workflow created (copy from `.github/workflows/connectin-ci.yml` as template)
9. [ ] README created with business context + architecture diagram
10. [ ] Port registered and confirmed working

## Sunsetting a Product

When discontinuing a product, follow `.claude/workflows/sunset.md`.

---

*This registry is the source of truth for product metadata.*
*Update whenever products change tier, add/remove backend, or change ports.*
