# ArchForge - Product Addendum

## Product Overview

**ArchForge** is an AI-powered enterprise architecture platform that generates standards-compliant EA artifacts from natural language descriptions. It targets enterprise architects, solution architects, IT directors, and business analysts who spend 60-80% of their time on manual documentation.

### Key Value Proposition
- Natural language → TOGAF, ArchiMate, C4, BPMN artifacts in seconds
- Interactive canvas for viewing, editing, and refining generated artifacts
- Multi-format export (PNG, SVG, PDF, PlantUML, ArchiMate XML)
- Living architecture that auto-updates as systems change

### Market Context
- $1.14B market (2024) → $1.6-2.2B by 2030
- No AI-native EA tool exists — 18-month first-mover window
- Competitors: LeanIX, Ardoq, MEGA HOPEX, BiZZdesign, Sparx Systems

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Next.js 14+ / React 18+ | App Router, Tailwind CSS, shadcn/ui |
| Backend | Fastify + TypeScript | Plugin architecture |
| Database | PostgreSQL 15+ via Prisma | Primary data store |
| AI/LLM | Claude API (Anthropic) | Artifact generation, document ingestion |
| Canvas | React Flow or Excalidraw | Interactive diagram editing |
| Real-time | WebSocket (Fastify WS) | Collaboration |
| Auth | JWT + API Keys | Dual auth pattern |
| Export | Sharp (images), PDFKit (PDF) | Multi-format |
| Testing | Jest (unit), Playwright (E2E) | TDD mandatory |

## Port Assignments

| Service | Port | URL |
|---------|------|-----|
| Frontend (Web) | 3116 | http://localhost:3116 |
| Backend (API) | 5012 | http://localhost:5012 |

## Conventions

### Directory Structure
```
products/archforge/
├── apps/
│   ├── api/              # Fastify backend
│   │   ├── src/
│   │   │   ├── plugins/  # Fastify plugins
│   │   │   ├── routes/   # API routes
│   │   │   ├── services/ # Business logic
│   │   │   ├── schemas/  # Zod validation schemas
│   │   │   └── types/    # TypeScript types
│   │   ├── prisma/       # Database schema + migrations
│   │   └── tests/        # Backend tests
│   └── web/              # Next.js frontend
│       ├── src/
│       │   ├── app/      # App Router pages
│       │   ├── components/ # React components
│       │   ├── hooks/    # Custom hooks
│       │   ├── lib/      # Utilities
│       │   └── types/    # Frontend types
│       └── tests/        # Frontend tests
├── packages/             # Shared code
├── e2e/                  # Playwright E2E tests
├── docs/
│   ├── PRD.md           # Product Requirements
│   ├── strategy/        # Strategy documents
│   ├── ADRs/            # Architecture decisions
│   └── specs/           # Feature specifications
└── .claude/
    └── addendum.md      # This file
```

### API Design Patterns
- RESTful API with versioned prefix: `/api/v1/`
- Zod input validation at route boundary
- Service layer for business logic (no logic in route handlers)
- AppError with RFC 7807 problem details
- Structured logging with request correlation

### Key Domain Concepts

| Concept | Description |
|---------|-------------|
| Project | A workspace containing related architecture artifacts |
| Artifact | A generated EA artifact (diagram, model, document) |
| Framework | EA standard (TOGAF, ArchiMate, C4, BPMN, Zachman) |
| Template | Pre-built starting point for artifact generation |
| Canvas | Interactive visual editor for artifacts |
| Generation | AI process of creating artifacts from natural language |
| Ingestion | AI process of extracting architecture from documents |

### Artifact Lifecycle
```
Draft → In Review → Approved → Published → Archived
```

### User Roles
- **Viewer**: Read-only access to shared artifacts
- **Editor**: Can create and modify artifacts
- **Admin**: Full project management (RBAC, settings)
- **Owner**: Project creator, full control

## Key Documents
- **PRD**: `products/archforge/docs/PRD.md`
- **Strategy**: `products/archforge/docs/strategy/PRODUCT-STRATEGY-2026.md`
- **Architecture**: `products/archforge/docs/architecture.md` (pending)
