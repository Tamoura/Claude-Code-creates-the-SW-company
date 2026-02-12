# Feature Specification: MVP Recommendation Platform

**Product**: RecomEngine
**Feature Branch**: `feature/recomengine/mvp`
**Created**: 2026-02-12
**Status**: Approved
**Input**: CEO brief: "New product: B2B SaaS product recommendation orchestrator for e-commerce"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Tenant Onboarding & API Key Provisioning (Priority: P0)

An admin registers on RecomEngine, creates a tenant representing their e-commerce store, and generates API keys to authenticate SDK and server-to-server requests. This is the entry point for every customer.

**Why this priority**: Without tenant management and API keys, no other feature can function. Every subsequent capability depends on authenticated, tenant-scoped access.

**Independent Test**: Can be fully tested by registering an admin, creating a tenant, generating an API key, and verifying the key authenticates a request. Delivers value: the customer has a provisioned account ready for integration.

**Acceptance Scenarios**:

1. **Given** a new user, **When** they POST to `/api/v1/auth/signup` with valid email and password, **Then** a 201 response is returned with a JWT token and user object.
2. **Given** a logged-in admin, **When** they POST to `/api/v1/tenants` with `{ name: "Acme Store" }`, **Then** a 201 response is returned with tenant object including `id`, `name`, `status: "active"`, `createdAt`, and data is isolated from all other tenants.
3. **Given** an active tenant, **When** admin POSTs to `/api/v1/tenants/:id/api-keys` with `{ name: "Production SDK", permissions: "read" }`, **Then** a 201 response is returned with the full API key (shown only once) and the key is stored as HMAC-SHA256 hash.
4. **Given** an API key with read-only permissions, **When** a request is made to POST `/api/v1/events` using that key, **Then** a 403 response is returned with "Insufficient permissions: write access required".
5. **Given** an active tenant, **When** admin PUTs to `/api/v1/tenants/:id` with `{ status: "suspended" }`, **Then** all API requests using that tenant's keys return 403 "Tenant suspended" and existing data is preserved.

---

### User Story 2 - Event Ingestion & Catalog Management (Priority: P0)

A developer integrates their e-commerce site with RecomEngine by uploading their product catalog and sending behavioral events (views, clicks, purchases) as users browse their site.

**Why this priority**: Events and catalog data are the inputs to the recommendation engine. Without them, recommendations cannot be generated.

**Independent Test**: Can be fully tested by uploading catalog items via API, sending events via API, and verifying events are persisted and catalog is queryable. Delivers value: customer's behavioral data is flowing into the system.

**Acceptance Scenarios**:

1. **Given** a valid API key with write permissions, **When** POST is sent to `/api/v1/catalog` with product data (`productId`, `name`, `category`, `price`), **Then** a 201 response is returned with the created catalog item.
2. **Given** a valid API key with write permissions, **When** POST is sent to `/api/v1/events` with `{ eventType: "product_viewed", userId: "user-123", productId: "prod-456" }`, **Then** a 202 response is returned within 50ms and the event is persisted.
3. **Given** a batch of 100 events, **When** POST is sent to `/api/v1/events/batch`, **Then** a 202 response is returned with count of accepted/rejected events within 200ms.
4. **Given** a duplicate event (same userId + eventType + productId + timestamp), **When** submitted, **Then** a 200 response is returned without creating a duplicate record.
5. **Given** a catalog item marked as unavailable, **When** recommendations are requested, **Then** the unavailable item is excluded from all results.

---

### User Story 3 - Personalized Recommendations with Strategy Selection (Priority: P0)

A merchant's website requests personalized product recommendations for a specific user. The system selects the appropriate strategy (collaborative, content-based, trending, or frequently bought together) and returns ranked products with confidence scores and human-readable explanations.

**Why this priority**: This is the core value proposition. Without recommendations, there is no product.

**Independent Test**: Can be fully tested by seeding events and catalog, requesting recommendations for a user, and verifying the response contains relevant products with scores and reasons. Delivers value: personalized product recommendations on the merchant's site.

**Acceptance Scenarios**:

1. **Given** a user with 10+ behavioral events, **When** GET `/api/v1/recommendations?userId=user-123&limit=8` is called, **Then** a 200 response with 8 recommendations is returned within 100ms, each with `productId`, `name`, `imageUrl`, `price`, `score`, `reason`.
2. **Given** a new user with 0 events (cold start), **When** recommendations are requested, **Then** trending products are returned as fallback within 100ms and response includes `meta.strategy: "trending_fallback"` and `meta.isFallback: true`.
3. **Given** a tenant with `defaultStrategy: "content_based"`, **When** recommendations are requested without a strategy override, **Then** content-based recommendations are returned.
4. **Given** a request with `?strategy=frequently_bought_together&productId=prod-456`, **When** processed, **Then** products frequently purchased with prod-456 are returned with `meta.strategy: "frequently_bought_together"`.
5. **Given** cached recommendations exist for a user, **When** requested again within 5 minutes, **Then** cached results are returned with `meta.cached: true`.

---

### User Story 4 - A/B Testing Framework (Priority: P0)

A growth manager creates an experiment comparing two recommendation strategies (e.g., collaborative vs. content-based), splits traffic between them, and views statistically rigorous results to determine which strategy performs better.

**Why this priority**: A/B testing is a key differentiator. Merchants need data-driven proof that recommendations drive revenue.

**Independent Test**: Can be fully tested by creating an experiment, making recommendation requests for multiple users (verifying consistent variant assignment), and querying experiment results. Delivers value: data-driven recommendation strategy optimization.

**Acceptance Scenarios**:

1. **Given** a logged-in admin, **When** they POST to `/api/v1/tenants/:id/experiments` with experiment config, **Then** a 201 response with experiment in `draft` state is returned.
2. **Given** a running experiment, **When** recommendation requests arrive for users, **Then** users are deterministically assigned to control or variant based on hash(userId + experimentId).
3. **Given** user-123 assigned to "variant", **When** user-123 makes multiple recommendation requests across sessions, **Then** user-123 always receives the variant strategy.
4. **Given** a running experiment with sufficient data, **When** GET `/api/v1/tenants/:id/experiments/:expId/results` is called, **Then** results include `controlMetric`, `variantMetric`, `lift`, `pValue`, `isSignificant`, `sampleSize`.
5. **Given** a placement with a running experiment, **When** another experiment is created for the same placement, **Then** a 409 response is returned.

---

### User Story 5 - Analytics Dashboard (Priority: P0)

A merchant logs into the RecomEngine dashboard, views KPI cards showing recommendation performance (impressions, clicks, CTR, conversions, revenue), explores time-series charts, and exports data as CSV.

**Why this priority**: Without analytics, merchants cannot measure ROI and will churn. The dashboard is the primary interface for non-technical users.

**Independent Test**: Can be fully tested by seeding analytics data, loading the dashboard, and verifying KPI cards, charts, and CSV export work. Delivers value: merchants can measure and prove recommendation ROI.

**Acceptance Scenarios**:

1. **Given** a logged-in admin viewing a tenant's analytics, **When** the dashboard loads, **Then** KPI cards display impressions, clicks, CTR, conversions, and revenue for the selected date range, and page loads in <2 seconds (LCP).
2. **Given** a date range filter set to "Last 30 days", **When** the time-series chart renders, **Then** it displays daily data points for impressions, clicks, and conversions.
3. **Given** the admin clicks "Export CSV", **When** the export completes, **Then** a CSV file downloads containing all metrics visible on the dashboard.
4. **Given** real-time events flowing, **When** the dashboard is open, **Then** data refreshes every 60 seconds without full page reload.

---

### User Story 6 - Embeddable JavaScript SDK (Priority: P0)

A developer adds a single `<script>` tag to their merchant site. The SDK auto-initializes, fetches recommendations, renders product widgets, and automatically tracks impressions and clicks.

**Why this priority**: The SDK is how merchants integrate. Without it, they must build custom UI — a dealbreaker for non-technical users.

**Independent Test**: Can be fully tested by loading the SDK on a test HTML page, verifying it renders recommendations, and checking that impression/click events are automatically tracked. Delivers value: 30-minute integration from signup to live recommendations.

**Acceptance Scenarios**:

1. **Given** a `<script src="recomengine.v1.js" data-api-key="rk_..." async>` tag on a page, **When** the page loads, **Then** SDK initializes and renders recommendation widgets within 500ms, and the SDK bundle is <10KB gzipped.
2. **Given** a `<div data-recomengine-placement="product-page">` element, **When** it enters the viewport, **Then** SDK fetches recommendations and renders product cards, and a `recommendation_impressed` event is auto-tracked.
3. **Given** the RecomEngine API is unreachable, **When** SDK attempts to load recommendations, **Then** the widget container remains empty and no errors appear in the console.
4. **Given** a user clicks a recommended product, **Then** a `recommendation_clicked` event is auto-tracked before navigation.

---

### User Story 7 - Widget Customization (Priority: P0)

A merchant configures the appearance of recommendation widgets (layout, colors, number of items, CTA text) via the dashboard, and the changes propagate to their site within 60 seconds.

**Why this priority**: Merchants need widgets that match their brand. A generic widget reduces adoption.

**Independent Test**: Can be fully tested by saving widget config via API, then loading the SDK and verifying the widget renders with the configured styles. Delivers value: brand-matched recommendation widgets.

**Acceptance Scenarios**:

1. **Given** a tenant's widget configuration, **When** admin sets `{ layout: "carousel", columns: 4, showPrice: true, ctaText: "Add to Cart", theme: { primaryColor: "#ff6600" } }`, **Then** SDK renders recommendations using the specified layout and styling.
2. **Given** a widget config change, **When** 60 seconds pass, **Then** the SDK fetches updated config and re-renders with new styles without page reload.

---

### Edge Cases

- What happens when a tenant's API key is revoked mid-session? SDK should gracefully hide widgets.
- How does the system handle an event with a productId not in the catalog? Event is accepted with a warning logged; recommendation engine ignores unknown products.
- What if collaborative filtering has insufficient data (<1000 users)? System falls back to content-based or trending strategy with `meta.isFallback: true`.
- What happens when Redis is down? Recommendations are computed synchronously from PostgreSQL; rate limiting falls back to in-memory; cached results are unavailable but system remains functional.
- How does batch event ingestion handle partial failures? Accepted events are persisted; rejected events return per-event error details; overall request succeeds with 202.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support admin registration with email and bcrypt-hashed password (cost factor 12)
- **FR-002**: System MUST issue JWT access tokens (1hr) and HttpOnly refresh token cookies (7d)
- **FR-003**: System MUST support tenant CRUD with status lifecycle (active, suspended, deleted)
- **FR-004**: System MUST enforce tenant data isolation via tenant_id scoping on all queries
- **FR-005**: System MUST support API key generation with HMAC-SHA256 hashing and read/read-write permissions
- **FR-006**: System MUST enforce max 10 active API keys per tenant
- **FR-007**: System MUST accept individual events via POST `/api/v1/events` with schema validation
- **FR-008**: System MUST accept batch events (up to 100) via POST `/api/v1/events/batch`
- **FR-009**: System MUST support 7 event types: product_viewed, product_clicked, add_to_cart, remove_from_cart, purchase, recommendation_clicked, recommendation_impressed
- **FR-010**: System MUST deduplicate events on (tenantId + userId + eventType + productId + timestamp)
- **FR-011**: System MUST support catalog item CRUD with batch upload (up to 500 items)
- **FR-012**: System MUST exclude unavailable catalog items from recommendations
- **FR-013**: System MUST return personalized recommendations via GET `/api/v1/recommendations`
- **FR-014**: System MUST support 4 strategies: collaborative, content_based, trending, frequently_bought_together
- **FR-015**: System MUST handle cold-start users (0-4 events) with trending fallback
- **FR-016**: System MUST include score (0-1) and human-readable reason in each recommendation
- **FR-017**: System MUST support A/B experiment CRUD with deterministic user assignment
- **FR-018**: System MUST compute experiment results with p-value, confidence intervals, and significance
- **FR-019**: System MUST enforce max 1 running experiment per placement per tenant
- **FR-020**: System MUST display KPI cards, time-series charts, and top products on the analytics dashboard
- **FR-021**: System MUST support CSV export of analytics data
- **FR-022**: System MUST provide embeddable JS SDK <10KB that auto-tracks impressions and clicks
- **FR-023**: System MUST support widget customization (layout, colors, columns, CTA text)
- **FR-024**: System MUST attribute revenue from purchases within 30 min of recommendation clicks
- **FR-025**: All API responses MUST follow JSON envelope: `{ data, meta, errors }`
- **FR-026**: All errors MUST follow RFC 7807 Problem Details format
- **FR-027**: All list endpoints MUST support pagination (limit, offset, max 100)

### Non-Functional Requirements

- **NFR-001**: Recommendation API MUST respond in <100ms (p95)
- **NFR-002**: Event ingestion API MUST acknowledge in <50ms (p95)
- **NFR-003**: Batch event ingestion (100 events) MUST complete in <200ms (p95)
- **NFR-004**: Dashboard page load MUST complete in <2s (LCP)
- **NFR-005**: SDK bundle MUST be <10KB gzipped
- **NFR-006**: API keys MUST be stored as HMAC-SHA256 hashes (never plaintext)
- **NFR-007**: Rate limiting: 1,000 reads/min, 500 writes/min per API key (distributed via Redis)
- **NFR-008**: All API communication MUST use HTTPS with TLS 1.2+
- **NFR-009**: WCAG 2.1 Level AA for the analytics dashboard
- **NFR-010**: All user input MUST be validated with Zod schemas
- **NFR-011**: Structured logging with PII redaction and correlation IDs on all requests

### Key Entities

- **Admin**: Platform administrator with email, password, role (admin/super_admin). Owns tenants.
- **Tenant**: Customer organization with name, status, config (default strategy, CORS origins). Has isolated data.
- **ApiKey**: HMAC-SHA256 hashed key with prefix, permissions (read/read_write), scoped to tenant.
- **CatalogItem**: Product in a tenant's catalog with productId, name, category, price, imageUrl, attributes, available flag.
- **Event**: Behavioral signal (view, click, add-to-cart, purchase) with userId, productId, timestamp, metadata. Partitioned by month.
- **Experiment**: A/B test comparing two strategies with traffic split, metric, status lifecycle.
- **ExperimentResult**: Aggregated metrics per variant (impressions, clicks, conversions, revenue, sample size).
- **AnalyticsDaily**: Pre-aggregated daily stats per tenant per placement per strategy.
- **WidgetConfig**: Widget appearance config per tenant per placement (layout, columns, theme, CTA).
- **RevenueAttribution**: Link between recommendation click and subsequent purchase within 30-min window.

## Component Reuse Check *(mandatory - ConnectSW)*

| Need | Existing Component | Reuse? |
|------|-------------------|--------|
| JWT + API Key auth | Auth Plugin (stablecoin-gateway) | Adapt (change permissions to read/read_write, add tenant context) |
| API key hashing | Crypto Utils (@connectsw/shared) | Adapt (change prefix from sk_live_ to rk_live_) |
| DB connection | Prisma Plugin (@connectsw/shared) | Yes (copy as-is) |
| Redis connection | Redis Plugin (@connectsw/shared) | Yes (copy as-is) |
| Rate limiting | Redis Rate Limit Store (stablecoin-gateway) | Yes (copy as-is) |
| Structured logging | Logger (@connectsw/shared) | Yes (copy as-is) |
| Request metrics | Observability Plugin (stablecoin-gateway) | Yes (copy as-is) |
| Error handling | Error Classes (invoiceforge) | Yes (copy as-is) |
| Pagination | Pagination Helper (invoiceforge) | Yes (copy as-is) |
| Frontend auth state | useAuth hook (stablecoin-gateway) | Adapt (update API client import) |
| Token storage | Token Manager (stablecoin-gateway) | Yes (copy as-is) |
| KPI display | StatCard (stablecoin-gateway) | Yes (copy as-is) |
| Navigation | Sidebar pattern (stablecoin-gateway) | Adapt (replace nav items for RecomEngine routes) |
| Error boundary | ErrorBoundary (stablecoin-gateway) | Yes (copy as-is) |
| Route protection | ProtectedRoute (stablecoin-gateway) | Yes (copy as-is) |
| Dark/light mode | useTheme + ThemeToggle (stablecoin-gateway) | Adapt (change storage key) |
| Docker | Dockerfile + docker-compose (stablecoin-gateway) | Adapt (ports, DB name) |
| CI/CD | GitHub Actions workflow (stablecoin-gateway) | Adapt (paths, DB name) |
| E2E testing | Playwright config + auth fixture (stablecoin-gateway) | Adapt (API URL, port) |
| Recommendation engine | None found | Build new |
| A/B test assignment | None found | Build new |
| SDK (JavaScript) | None found | Build new |
| Analytics aggregation | None found | Build new |

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Admin can go from signup to live recommendations on a test page in <30 minutes
- **SC-002**: Recommendation API responds in <100ms (p95) with 8 products
- **SC-003**: Event ingestion handles 10,000 events/second sustained
- **SC-004**: SDK bundle is <10KB gzipped and renders within 500ms
- **SC-005**: A/B test framework detects 5% lift at 95% confidence within 7 days for tenants with 10k+ daily visitors
- **SC-006**: Dashboard loads in <2 seconds (LCP) with KPI cards, charts, and export
- **SC-007**: All tests pass with >= 80% coverage
- **SC-008**: Zero HIGH/CRITICAL security vulnerabilities

## Out of Scope

- Email recommendation generation
- User segmentation engine
- Webhook delivery for experiment/model events
- White-label embeddable dashboard
- Bulk historical event import (CSV/JSON upload)
- Custom algorithm plugin system
- Mobile native SDKs (iOS/Android)
- GraphQL API
- Shopify/WooCommerce/Magento plugins
- GDPR consent management UI
- Revenue forecasting / predicted uplift
- Visual drag-and-drop widget builder
- Multi-armed bandit automatic optimization
- Real-time streaming data pipeline (Kafka/Flink)
- Custom ML model hosting
- Search-powered recommendations
- Subscription billing (Phase 2)
- Team/role management (Phase 2)
