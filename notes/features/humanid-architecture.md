# HumanID Architecture - Feature Notes

## Task
ARCH-01: System design for HumanID -- Universal Digital Identity Platform

## Branch
`feature/humanid/architecture`

## Key Decisions Made

### Tech Stack (Confirmed from PRD)
- Backend: Fastify 4 + TypeScript (port 5013)
- Frontend: Next.js 14+ / React 18+ / Tailwind (port 3117)
- Database: PostgreSQL 15+ via Prisma (14 tables, 5 domains)
- Cache: Redis 7
- Identity: W3C DIDs, Verifiable Credentials
- Blockchain: Polygon (L2)
- Biometrics: FIDO2 / WebAuthn
- Crypto: libsodium / noble-ed25519
- ZKP: snarkjs / circom (WASM)
- Auth: JWT + API Keys

### Reusable ConnectSW Components Identified
- `@connectsw/auth` -- JWT + API key auth, sessions, routes
- `@connectsw/ui` -- Button, Card, Input, Badge, DataTable, DashboardLayout
- `@connectsw/shared` -- Logger, crypto, Prisma/Redis plugins
- `@connectsw/audit` -- Audit logging with DB + ring buffer
- `@connectsw/notifications` -- Email + in-app notifications

### Architecture Decisions (ADRs to write)
1. **ADR-001**: DID method selection (did:humanid custom method vs did:key vs did:web)
2. **ADR-002**: ZKP framework (snarkjs/circom vs zk-SNARKs alternatives)
3. **ADR-003**: Blockchain network (Polygon vs alternatives)
4. **ADR-004**: Credential format (W3C VC Data Model 2.0 vs alternatives)
5. **ADR-005**: Key management strategy (WebCrypto + device-bound keys)

## Deliverables
- [x] Architecture document with C4 diagrams (architecture.md)
- [x] Prisma schema (schema.prisma)
- [x] ER diagram (in architecture.md)
- [x] OpenAPI 3.0 contracts (openapi.yaml)
- [x] ADRs (at least 3)
- [x] Traceability matrix
- [x] Security considerations
- [x] Updated addendum

## Research Notes

### DID Libraries Evaluated
- `did-resolver` (npm): Universal DID resolver, W3C compliant, well-maintained
- `did-jwt` (npm): JWT-based DID operations, from Decentralized Identity Foundation
- `@noble/ed25519` (npm): Fast Ed25519 for key generation, well-audited
- `@simplewebauthn/server` (npm): FIDO2/WebAuthn server-side, actively maintained

### ZKP Libraries Evaluated
- `snarkjs` (npm): Groth16 + PLONK provers, circom circuit compiler, WASM support
- `circomlibjs` (npm): Poseidon hash and other crypto primitives for circom
- Best fit: snarkjs for proof generation, circom for circuit definition

### Blockchain Libraries
- `ethers.js` v6: Standard Ethereum/Polygon interaction
- `@polygon/sdk`: Polygon-specific utilities

## Session Log
- 2026-02-19: Started architecture task. Read full PRD, addendum, component registry.
