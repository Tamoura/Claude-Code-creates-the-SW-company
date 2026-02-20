# HumanID — Universal Digital Identity Platform

> 8 billion people. One identity standard. Zero central control.

HumanID gives every human a secure, verifiable digital identity. Built on decentralized principles with blockchain-anchored credentials and biometric proofing, it enables identity verification without centralized authorities.

## Why HumanID Exists

The $34.5B digital identity market lacks a platform that combines W3C standards, biometric proofing, zero-knowledge privacy, and a developer-first API. Existing solutions are either crypto-native (Worldcoin, Civic), enterprise-locked (Microsoft Entra), or lack privacy-by-design. HumanID fills this gap.

## Architecture Overview

```mermaid
graph TD
    subgraph "Users"
        HOLDER["Holder<br/>(Identity Owner)"]
        ISSUER["Issuer<br/>(Organization)"]
        DEV["Developer<br/>(API Integrator)"]
        VERIFIER["Verifier<br/>(Credential Checker)"]
        ADMIN["Admin<br/>(Platform Manager)"]
    end

    subgraph "HumanID Platform"
        WEB["Web App<br/>(Next.js 14, :3116)"]
        API["API Server<br/>(Fastify 4, :5013)"]

        subgraph "Data Layer"
            DB["PostgreSQL 15<br/>(14 tables, 5 domains)"]
            REDIS["Redis 7<br/>(Cache, Rate Limiting)"]
        end

        subgraph "Identity Services"
            DID_SVC["DID Service<br/>(Create, Resolve, Update)"]
            CRED_SVC["Credential Service<br/>(Issue, Verify, Revoke)"]
            ZKP_SVC["ZKP Engine<br/>(snarkjs / Groth16)"]
            BIO_SVC["Biometric Service<br/>(FIDO2 / WebAuthn)"]
        end
    end

    subgraph "External Services"
        POLYGON["Polygon Network<br/>(L2, Event Anchoring)"]
        SENDGRID["SendGrid<br/>(Transactional Email)"]
        FIDO2["FIDO2 Authenticators<br/>(Hardware Keys)"]
    end

    HOLDER & ISSUER & DEV & VERIFIER & ADMIN --> WEB
    WEB --> API
    API --> DB & REDIS
    API --> DID_SVC & CRED_SVC & ZKP_SVC & BIO_SVC
    API --> POLYGON & SENDGRID
    BIO_SVC --> FIDO2

    style WEB fill:#339af0,color:#fff
    style API fill:#51cf66,color:#fff
    style DB fill:#ff922b,color:#fff
    style REDIS fill:#ff922b,color:#fff
    style POLYGON fill:#845ef7,color:#fff
```

## Key Features

| Feature | Description |
|---------|-------------|
| **Self-Sovereign Identity** | Users own and control their digital ID via DIDs |
| **Verifiable Credentials** | W3C-compliant, cryptographically signed, tamper-evident |
| **Selective Disclosure** | Zero-knowledge proofs reveal only what is needed |
| **Blockchain Anchoring** | Immutable proof of identity events on Polygon |
| **Biometric Proofing** | FIDO2/WebAuthn for secure authentication |
| **Developer API** | 37 RESTful endpoints with API key authentication |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 18, Tailwind CSS |
| Backend | Fastify 4, TypeScript |
| Database | PostgreSQL 15 via Prisma (14 tables) |
| Cache | Redis 7 |
| Identity | W3C DIDs, Verifiable Credentials |
| Blockchain | Polygon L2 |
| Biometrics | FIDO2 / WebAuthn |
| Crypto | Ed25519, AES-256-GCM, Groth16 ZKP |
| Testing | Jest, Playwright |

## Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 15+ (or use Docker)
- Redis 7+ (or use Docker)

### Quick Start

```bash
# 1. Start infrastructure
cd products/humanid
docker compose up -d

# 2. Set up environment
cp .env.example .env
# Edit .env with your values (JWT_SECRET is required)

# 3. Install dependencies
cd apps/api && npm install && cd ../..
cd apps/web && npm install && cd ../..

# 4. Run database migrations
npm run db:migrate

# 5. Generate Prisma client
npm run db:generate

# 6. Start development servers
npm run dev
# API: http://localhost:5013
# Web: http://localhost:3116
```

### Port Assignments

| Service | Port | URL |
|---------|------|-----|
| Frontend (Web) | 3116 | http://localhost:3116 |
| Backend (API) | 5013 | http://localhost:5013 |
| PostgreSQL | 5432 | localhost:5432 |
| Redis | 6379 | localhost:6379 |

## API Overview

37 endpoints organized into 9 areas:

```mermaid
graph LR
    subgraph "API Surface (/api/v1)"
        AUTH["Auth<br/>(5 endpoints)"]
        DIDS["DIDs<br/>(4 endpoints)"]
        CREDS["Credentials<br/>(6 endpoints)"]
        VERIFY["Verification<br/>(4 endpoints)"]
        ISSUERS["Issuers<br/>(4 endpoints)"]
        DEVS["Developers<br/>(4 endpoints)"]
        ADMIN["Admin<br/>(4 endpoints)"]
        TEMPLATES["Templates<br/>(3 endpoints)"]
        WALLET["Wallet<br/>(3 endpoints)"]
    end

    style AUTH fill:#339af0,color:#fff
    style DIDS fill:#51cf66,color:#fff
    style CREDS fill:#51cf66,color:#fff
    style VERIFY fill:#845ef7,color:#fff
    style ISSUERS fill:#ff922b,color:#fff
```

### Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/auth/register` | POST | Create new account |
| `/api/v1/auth/login` | POST | Authenticate and get tokens |
| `/api/v1/dids` | POST | Create a new DID |
| `/api/v1/dids/:did` | GET | Resolve a DID |
| `/api/v1/credentials` | POST | Issue a credential |
| `/api/v1/credentials/:id/verify` | POST | Verify a credential |
| `/api/v1/verify/request` | POST | Create verification request |
| `/api/v1/wallet/credentials` | GET | List holder's credentials |

### Auth Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant API as HumanID API
    participant DB as PostgreSQL
    participant R as Redis

    C->>API: POST /api/v1/auth/register {email, password}
    API->>DB: Create user + hash password (bcrypt)
    API->>API: Generate JWT (access + refresh)
    API-->>C: 201 {accessToken, refreshToken, user}

    C->>API: POST /api/v1/auth/login {email, password}
    API->>DB: Verify credentials
    API->>DB: Create session
    API-->>C: 200 {accessToken, refreshToken}

    C->>API: GET /api/v1/dids (Authorization: Bearer token)
    API->>R: Check rate limit
    API->>API: Verify JWT
    API->>DB: Query user's DIDs
    API-->>C: 200 {dids: [...]}
```

## Data Model

5 domains, 14 tables:

```mermaid
erDiagram
    users ||--o{ dids : "owns"
    users ||--o{ sessions : "has"
    users ||--o{ api_keys : "manages"
    users ||--o{ audit_logs : "generates"
    users ||--o{ issuers : "registers as"

    dids ||--o{ did_documents : "has versions"
    dids ||--o{ biometric_bindings : "bound to"
    dids ||--o{ recovery_configs : "protected by"
    dids ||--o{ credentials : "holds"
    dids ||--o{ credentials : "issues"
    dids ||--o{ blockchain_anchors : "anchored"

    issuers ||--o{ credentials : "issues"
    issuers ||--o{ credential_templates : "defines"

    credentials ||--o{ credential_presentations : "presented in"
    credentials ||--o{ blockchain_anchors : "anchored"

    verification_requests ||--o{ credential_presentations : "results in"
```

## Project Structure

```
products/humanid/
├── apps/
│   ├── api/                 # Fastify backend (port 5013)
│   │   ├── src/
│   │   │   ├── plugins/     # Fastify plugins (prisma, redis, auth, observability)
│   │   │   ├── routes/v1/   # API routes
│   │   │   ├── services/    # Business logic
│   │   │   ├── utils/       # Logger, crypto, validation
│   │   │   └── types/       # TypeScript types, AppError
│   │   ├── prisma/          # Schema + migrations
│   │   └── tests/           # Integration tests
│   └── web/                 # Next.js frontend (port 3117)
│       └── src/
│           ├── app/         # App Router pages
│           ├── components/  # React components
│           └── hooks/       # Custom hooks
├── docs/
│   ├── PRD.md              # Product Requirements
│   ├── architecture.md     # System Architecture
│   ├── security.md         # Security Considerations
│   ├── openapi.yaml        # API Contract (37 endpoints)
│   └── ADRs/               # 5 Architecture Decision Records
├── docker-compose.yml       # PostgreSQL 15 + Redis 7
├── .env.example             # Environment template
└── README.md                # This file
```

## Documentation

| Document | Description |
|----------|-------------|
| [PRD](docs/PRD.md) | Product Requirements Document |
| [Architecture](docs/architecture.md) | System Architecture |
| [Security](docs/security.md) | Security Considerations |
| [OpenAPI](docs/openapi.yaml) | API Contract (37 endpoints) |
| [ADR-001](docs/ADRs/ADR-001-did-method.md) | Custom DID Method |
| [ADR-002](docs/ADRs/ADR-002-zkp-framework.md) | ZKP Framework Choice |
| [ADR-003](docs/ADRs/ADR-003-blockchain-network.md) | Blockchain Network |
| [ADR-004](docs/ADRs/ADR-004-credential-format.md) | Credential Format |
| [ADR-005](docs/ADRs/ADR-005-key-management.md) | Key Management |

## License

UNLICENSED — ConnectSW Internal
