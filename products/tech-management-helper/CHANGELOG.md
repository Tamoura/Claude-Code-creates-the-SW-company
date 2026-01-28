# Changelog

All notable changes to Tech Management Helper will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-28

First production release of Tech Management Helper, a GRC (Governance, Risk, and Compliance) platform for Technology Managers. This release includes a complete authentication system and full-featured risk management module.

### Added

#### Authentication System (Sprint 1)

**Backend API (39 tests passing)**
- User registration endpoint with email validation and password hashing (bcrypt, 10 salt rounds)
- User login endpoint with session management and JWT token generation (7-day expiry)
- JWT authentication middleware with token validation and user verification
- Role-Based Access Control (RBAC) middleware using CASL with 4 role levels:
  - **ADMIN**: Full access including user management
  - **MANAGER**: Can manage resources and approve assessments
  - **ANALYST**: Can create and update resources (read/write but no delete)
  - **VIEWER**: Read-only access to all resources
- Protected API endpoints with role-based authorization
- Session tracking with IP address and user agent logging
- Secure password storage (never returned in API responses)
- Active user verification on every request
- Token expiry enforcement and refresh capability

**Frontend UI**
- Login page with email/password validation and error handling
- Client-side session management with React Context API
- Protected routes with automatic redirect to login
- Role-based route access control with hierarchy enforcement
- User profile display in header with role badges (color-coded)
- Logout functionality with automatic token cleanup
- Secure token storage in HTTP-only cookies (7-day expiry, SameSite: lax)
- API client with automatic Bearer token injection
- Loading states and error boundaries
- Responsive, mobile-friendly design with Tailwind CSS
- User initials avatar generation

**Security Features**
- TLS 1.2+ encryption for all connections
- Secure cookie storage with HttpOnly and SameSite flags
- CSRF protection
- Password hashing with bcrypt
- JWT token signing and verification
- Session invalidation on logout
- Protection against user enumeration attacks

#### Risk Management System (Sprint 2)

**Backend API (47 tests passing)**
- Complete Risk CRUD operations (Create, Read, Update, Delete)
- Risk scoring calculation using Likelihood × Impact formula (1-25 scale)
- Risk listing with pagination, filtering, and sorting:
  - Filter by status (IDENTIFIED, ASSESSED, MITIGATED, ACCEPTED)
  - Filter by category (TECHNICAL, OPERATIONAL, SECURITY, COMPLIANCE, FINANCIAL)
  - Filter by score range (Low: 1-8, Medium: 9-15, High: 16-25)
  - Sort by score, title, createdAt, updatedAt
- Risk-Asset linking and unlinking with junction table management
- Risk-Control linking and unlinking with relationship tracking
- Asset retrieval for specific risks (GET /api/v1/risks/:id/assets)
- Control retrieval for specific risks (GET /api/v1/risks/:id/controls)
- Comprehensive input validation using Zod schemas
- Multi-organization support with organization ID isolation
- Audit trail for all risk operations

**Frontend UI**
- Risk Register page with comprehensive table view showing:
  - Risk title, category, status, score (color-coded)
  - Owner, likelihood, impact, treatment
  - Created/updated timestamps
- Advanced filtering controls:
  - Status filter (all statuses with counts)
  - Category filter (all categories)
  - Score range filter (Low/Medium/High)
- Sortable table columns (title, score, status, category, owner)
- Color-coded risk levels:
  - Low (1-8): Green
  - Medium (9-15): Yellow
  - High (16-25): Red
- Real-time risk score calculation (Likelihood × Impact)
- Risk detail view with full information
- Risk creation and edit forms with validation
- Asset linking interface with search and selection
- Control linking interface with relationship management
- Responsive table design with mobile support
- Loading states and error handling
- Empty state messaging

**Risk Data Model**
- Risk attributes:
  - Title, description, category, status
  - Likelihood (1-5), Impact (1-5), Score (calculated)
  - Owner, treatment strategy
  - Organization and user relationships
  - Timestamps (created, updated)
- Risk-Asset many-to-many relationship
- Risk-Control many-to-many relationship
- Status workflow: IDENTIFIED → ASSESSED → MITIGATED/ACCEPTED
- 5 risk categories: Technical, Operational, Security, Compliance, Financial

### Technical

**Backend (apps/api)**
- Fastify 4.26+ web framework
- Prisma ORM 5.10+ with PostgreSQL 15
- TypeScript 5.3+ with strict mode
- JWT authentication with jsonwebtoken
- CASL for role-based access control
- Zod for runtime type validation
- Vitest for testing (86 tests, 100% passing)
- bcrypt for password hashing

**Frontend (apps/web)**
- Next.js 14+ with App Router and React Server Components
- React 18+ with TypeScript
- Tailwind CSS 3.4+ for styling
- shadcn/ui component library
- js-cookie for cookie management
- Responsive design (mobile-first)

**Database**
- PostgreSQL 15+ with Prisma migrations
- Multi-organization data isolation
- Session tracking with 7-day expiry
- Audit log retention capability
- Optimized indexes for query performance

**Infrastructure**
- Backend API: Port 5001 (Render-ready)
- Frontend Web: Port 3100 (Vercel-ready)
- Development: Docker Compose for PostgreSQL
- Testing: Dedicated test database with cleanup
- Environment: .env configuration management

**Quality**
- 86 backend tests with 100% pass rate
- Unit tests for all services and middleware
- Integration tests for API endpoints
- Type safety with TypeScript strict mode
- ESLint and Prettier code formatting
- Git hooks for pre-commit checks

### Documentation

- Product Requirements Document (PRD) v1.0
- System Architecture document with diagrams
- OpenAPI 3.0 API contract specification
- Data model with ERD and Prisma schema
- ADR-001: Open source library research
- ADR-002: Technology stack decisions
- Product addendum with technical decisions
- Release notes for v1.0.0
- Comprehensive README files

### Known Limitations

These features are planned for future releases:

- E2E test suite (Playwright) - Planned for v1.1.0
- User registration UI - Planned for v1.1.0
- Forgot password / password reset - Planned for v1.1.0
- Control management module - Planned for v1.2.0
- Asset management module - Planned for v1.3.0
- Assessment workflow - Planned for v1.4.0
- Framework library (NIST CSF, ISO 27001, COBIT, IT4IT) - Planned for v1.5.0
- Compliance dashboard with metrics - Planned for v1.6.0
- PDF report generation - Planned for v1.7.0
- Audit log viewer - Planned for v1.8.0

## Development Process

This release was built using ConnectSW's AI-first development approach with:

- Test-Driven Development (TDD) - Red-Green-Refactor cycle
- 100% test coverage requirement before merging
- No mocks in tests - real database connections
- Git feature branches with pull request reviews
- Conventional commit message format
- Sprint-based delivery (2 sprints completed)

---

[1.0.0]: https://github.com/Tamoura/Claude-Code-creates-the-SW-company/releases/tag/tech-management-helper-v1.0.0
