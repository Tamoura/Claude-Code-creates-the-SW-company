# QDB One: Implementation Task Graph

**Generated**: February 15, 2026
**CEO Direction**: Build a UI prototype first — mock data, no real APIs. Validate the approach visually before any backend implementation.
**Approach**: Prototype-first. See it, approve it, then build it.

---

## Phase 0: Interactive Prototype (1-2 weeks)

**Goal**: A fully navigable Next.js app with mock data that demonstrates the complete QDB One experience. CEO and stakeholders can click through every screen, see the navigation, understand the UX — all before writing a single line of backend code.

**What this IS**:
- Real Next.js app running on localhost:3110
- All pages/routes from the site map built with mock JSON data
- Seamless navigation between portals (no page reloads)
- Persona/company switcher working (switches mock data context)
- Arabic/English toggle with RTL flip
- Realistic-looking dashboard with mock numbers
- Clickable notifications, search results, cross-portal links

**What this is NOT**:
- No real APIs, no GraphQL, no backend services
- No Kafka, no CDC, no MPI, no Keycloak
- No real database connections
- No authentication (fake login screen that just proceeds)
- No real data — all hardcoded JSON fixtures

---

### Sprint P.1: App Shell & Navigation (Days 1-3)

| Task ID | Task | Agent | Depends On | Est. Hours |
|---------|------|-------|-----------|------------|
| PROTO-01 | Initialize Next.js 14 app (`products/qdb-one/apps/web/`) with Tailwind CSS, app router, port 3110 | Frontend | — | 2 |
| PROTO-02 | Build app shell layout — header (logo, search bar, notification bell, persona dropdown), sidebar navigation, content area, footer | Frontend | PROTO-01 | 4 |
| PROTO-03 | Build sidebar navigation — Dashboard, Financing, Advisory, Guarantees, Documents, Profile. Highlight active section. Collapsible on mobile. | Frontend | PROTO-02 | 3 |
| PROTO-04 | Create mock data fixtures — JSON files with sample persons, organizations, loans, guarantees, sessions, notifications (bilingual AR/EN) | Frontend | PROTO-01 | 3 |
| PROTO-05 | Build mock auth context — fake login page (QDB Login button → proceeds to dashboard), session state with mock user, logout | Frontend | PROTO-01 | 2 |

**Sprint Goal**: App shell running at localhost:3110. Sidebar nav works. Login → Dashboard flow works with mock user.

---

### Sprint P.2: Dashboard & Persona Switching (Days 3-5)

| Task ID | Task | Agent | Depends On | Est. Hours |
|---------|------|-------|-----------|------------|
| PROTO-06 | Build dashboard home page (`/`) — summary cards grouped by portal (Financing: 2 loans, 1 app; Guarantees: 1 pending signature; Advisory: 1 upcoming session). Stats bar at top. | Frontend | PROTO-04 | 4 |
| PROTO-07 | Build "Requires Your Action" widget — pending signatures, missing documents, upcoming payments. Each item links to detail page. | Frontend | PROTO-06 | 2 |
| PROTO-08 | Build persona/company switcher dropdown — shows current company + role, can switch to another company. Dashboard reloads with different mock data per company. | Frontend | PROTO-06 | 3 |
| PROTO-09 | Build activity feed on dashboard — recent actions across portals in chronological order (mock data). | Frontend | PROTO-06 | 2 |
| PROTO-10 | Build notification panel — bell icon opens dropdown with unread notifications. Each notification shows source portal badge. Click → navigates to relevant page. | Frontend | PROTO-02, PROTO-04 | 3 |

**Sprint Goal**: Dashboard shows the full QDB One experience. Persona switching changes context. Notifications panel works.

---

### Sprint P.3: Financing Section (Days 5-7)

| Task ID | Task | Agent | Depends On | Est. Hours |
|---------|------|-------|-----------|------------|
| PROTO-11 | Build Financing overview page (`/financing`) — active loans summary, pending applications, total exposure | Frontend | PROTO-04 | 3 |
| PROTO-12 | Build Applications list page (`/financing/applications`) — table with status filters (draft, submitted, under review, approved, rejected) | Frontend | PROTO-04 | 3 |
| PROTO-13 | Build Application detail page (`/financing/applications/:id`) — status timeline, amount, documents, related items section showing linked guarantee | Frontend | PROTO-12 | 3 |
| PROTO-14 | Build Loans list page (`/financing/loans`) — active loans with balances, next payment dates | Frontend | PROTO-04 | 2 |
| PROTO-15 | Build Loan detail page (`/financing/loans/:id`) — balance, payment schedule table, payment history, documents, related guarantee/advisory links | Frontend | PROTO-14 | 3 |

**Sprint Goal**: Full Financing section navigable with mock data. Cross-portal links visible on detail pages.

---

### Sprint P.4: Guarantees & Advisory Sections (Days 7-9)

| Task ID | Task | Agent | Depends On | Est. Hours |
|---------|------|-------|-----------|------------|
| PROTO-16 | Build Guarantees overview page (`/guarantees`) — active guarantees, pending signatures count, total exposure | Frontend | PROTO-04 | 2 |
| PROTO-17 | Build Guarantee detail page (`/guarantees/:id`) — terms, status, beneficiary, related loan, collateral info, signatory list | Frontend | PROTO-16 | 3 |
| PROTO-18 | Build Pending Signatures page (`/guarantees/pending`) — list of guarantees awaiting user's signature with "Sign Now" buttons | Frontend | PROTO-16 | 2 |
| PROTO-19 | Build mock signature flow (`/guarantees/:id/sign`) — step-up auth prompt (mock), document preview, signature confirmation | Frontend | PROTO-17 | 2 |
| PROTO-20 | Build Advisory overview page (`/advisory`) — enrolled programs, upcoming sessions, recent assessments | Frontend | PROTO-04 | 2 |
| PROTO-21 | Build Program detail page (`/advisory/programs/:id`) — program description, milestones, progress bar, related sessions | Frontend | PROTO-20 | 2 |
| PROTO-22 | Build Session detail page (`/advisory/sessions/:id`) — date/time, advisor name, topic, materials, notes, cancel option | Frontend | PROTO-20 | 2 |
| PROTO-23 | Build Assessment detail page (`/advisory/assessments/:id`) — scores, recommendations, action items | Frontend | PROTO-20 | 2 |

**Sprint Goal**: Guarantee and Advisory sections fully navigable. Signature flow demonstrated. Cross-portal links work.

---

### Sprint P.5: Search, Documents, Profile & Polish (Days 9-12)

| Task ID | Task | Agent | Depends On | Est. Hours |
|---------|------|-------|-----------|------------|
| PROTO-24 | Build unified search — search bar in header, results page (`/search?q=...`) showing results from all portals with portal badges, grouped by type (companies, loans, guarantees, sessions) | Frontend | PROTO-04 | 4 |
| PROTO-25 | Build Document Center (`/documents`) — all documents from all portals in one list with filters (portal, type, date). Document detail page. | Frontend | PROTO-04 | 3 |
| PROTO-26 | Build Profile page (`/profile`) — user info from mock golden record, linked accounts list, linked companies and roles | Frontend | PROTO-04 | 2 |
| PROTO-27 | Build Settings page (`/profile/settings`) — language preference (AR/EN), notification preferences, "Link Existing Account" section | Frontend | PROTO-26 | 2 |
| PROTO-28 | Build mock identity linking screen — first-login "We found your accounts" flow, manual linking via email/CR with mock OTP | Frontend | PROTO-27 | 3 |
| PROTO-29 | Build Arabic/English toggle — language switcher in header, RTL layout flip, mock bilingual content on key pages (dashboard, financing overview) | Frontend | PROTO-02 | 3 |
| PROTO-30 | Build mock admin: Data Steward review queue (`/admin/identity/review`) — list of pending matches, side-by-side comparison, approve/reject buttons | Frontend | PROTO-04 | 3 |
| PROTO-31 | Cross-portal navigation polish — breadcrumbs spanning portals, back button works, deep-link URLs shareable, loading skeletons on page transitions | Frontend | All PROTO pages | 3 |
| PROTO-32 | Mobile responsive pass — sidebar becomes hamburger menu, cards stack vertically, touch-friendly on tablet/phone | Frontend | All PROTO pages | 3 |

**Sprint Goal**: Complete prototype. Every page from the site map is reachable and functional with mock data.

---

### Sprint P.6: Demo Prep (Day 12-13)

| Task ID | Task | Agent | Depends On | Est. Hours |
|---------|------|-------|-----------|------------|
| PROTO-33 | Create demo script — walkthrough order for CEO demo covering all key flows (login → dashboard → financing → cross-portal link → guarantee → sign → advisory → search → persona switch → AR/EN toggle → admin) | Frontend | All | 2 |
| PROTO-34 | Seed mock data for demo personas — "Fatima Al-Kuwari" (3 roles, 2 companies), "Ahmed Al-Thani" (1 role), "Foreign Shareholder" (QFI login). Each with realistic mock data. | Frontend | All | 2 |
| PROTO-35 | Bug fixes and UI cleanup from self-testing | Frontend | All | 4 |

---

## Prototype Summary

| Metric | Count |
|--------|-------|
| Total tasks | 35 |
| Estimated total | ~90 hours (~12 working days) |
| Pages/routes built | 30+ |
| Agent | Frontend only |
| Backend work | Zero |
| Mock data fixtures | ~5 JSON files |

### What the CEO Will See

```
LOGIN → Fake QDB Login page → Click "Sign in" → Dashboard

DASHBOARD:
  - Stats bar: "3 Active Loans | 1 Pending Signature | 2 Advisory Sessions"
  - Action items: "Guarantee GR-789 requires your signature"
  - Financing cards, Guarantee cards, Advisory cards
  - Activity feed
  - Notification bell with unread count

FINANCING → Click "Financing" in sidebar:
  - Overview with loan summaries
  - Applications list with status filters
  - Loan detail with payment schedule
  - "Related: Guarantee GR-789" link → click → jumps to Guarantees

GUARANTEES → Seamless transition (no reload):
  - Guarantee detail with "Sign Now" button
  - Signature flow mockup
  - "Related: Loan LN-456" link → click → back to Financing

ADVISORY → Click "Advisory":
  - Programs, sessions, assessments
  - Session detail with advisor info

SEARCH → Type "Al-Kuwari" in search bar:
  - Results from all portals grouped by type

PERSONA SWITCH → Click company dropdown:
  - Switch from "Al-Kuwari Trading" to "Qatar Tech Ventures"
  - Dashboard refreshes with different data

LANGUAGE → Click AR/EN toggle:
  - Layout flips to RTL
  - Arabic text appears on key sections

ADMIN → Data Steward view:
  - Match review queue with side-by-side comparison
```

### After Prototype Approval

Once the CEO approves the prototype, THEN we build the real backend:
- Phase 1: MPI + Auth + AuthZ (the identity foundation)
- Phase 2: Event pipeline + CDC + Read Store (the data layer)
- Phase 3: Real API subgraphs replacing mock data
- Phase 4: Portal integrations one at a time
- Phase 5: Production UI polish, design system, accessibility

The prototype becomes the frontend skeleton — we progressively replace mock JSON with real API calls.

---

**Checkpoint**: Prototype demo to CEO. All pages navigable with mock data. CEO approves the approach before any backend investment.
