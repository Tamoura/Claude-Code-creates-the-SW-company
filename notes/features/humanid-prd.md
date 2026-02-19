# HumanID PRD - Feature Notes

## Branch
`feature/humanid/prd`

## Task
PRD-01: Create Product Requirements Document for HumanID

## Decisions Made

### Persona Selection
- **Amira (Identity Holder)**: Refugee persona chosen to represent the most underserved use case -- portable identity across borders. This anchors the product vision.
- **Raj (Developer)**: Developer persona represents the primary revenue channel -- API/SDK integration fees.
- **Claire (Compliance Officer)**: Enterprise verifier persona represents the high-value customer segment.
- **Kwame (Credential Issuer)**: University registrar represents the issuer side of the credential ecosystem.

### MVP Scope
- 11 user stories in MVP, covering: identity creation, biometric enrollment, credential issuance/receipt/verification, selective disclosure (ZKP), developer registration and SDK, blockchain anchoring, wallet UI.
- Phase 2 adds: credential revocation, template management, presentation requests, billing, QR exchange, trusted issuer management.
- Explicitly excluded: mobile-native wallet, government ID integration, tokenomics, CRDT collaboration.

### Data Model
- 14 tables across 5 domains: Identity, Credentials, Verification, Issuers, Infrastructure.
- Key design decisions: biometrics never stored server-side, credential claims encrypted at rest, async blockchain anchoring.

### ID Registry
- User Stories: US-01 through US-18
- Functional Requirements: FR-001 through FR-030
- Non-Functional Requirements: NFR-001 through NFR-027
- Epics: EP-01 through EP-08

### Key Technical Decisions
- ZKP engine uses snarkjs/circom compiled to WASM for browser execution
- Polygon L2 for anchoring (low gas, fast confirmation)
- FIDO2/WebAuthn for biometrics (no proprietary hardware)
- Ed25519 for DID key pairs (fast, secure, widely supported)

## Files Created/Modified
- `products/humanid/docs/PRD.md` (new) - Full PRD with 18 user stories, 30 FR, 27 NFR
- `products/humanid/.claude/addendum.md` (updated) - Added architecture, site map, business logic sections
- `notes/features/humanid-prd.md` (new) - This file

## Patterns Learned
- PRD-STRUCTURE: ArchForge PRD provides best template structure -- TOC, numbered sections, consistent diagram styling
- ADDENDUM-TEMPLATE: ArchForge addendum has best completeness -- tech stack table, API surface summary, domain overview, plugin order
- PERSONA-DESIGN: Use extreme use cases (refugee, developing-country registrar) to stress-test the product design; if it works for them, it works for everyone
