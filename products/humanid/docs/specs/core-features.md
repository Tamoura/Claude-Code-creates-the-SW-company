# Feature Specification: HumanID — Core Features

**Product**: humanid
**Feature Branch**: `feature/humanid/core-mvp`
**Created**: 2026-02-21
**Status**: Accepted
**Version**: 1.0

## Business Context

### Problem Statement

8 billion people need secure digital identities, yet current systems are centralised, siloed, and privacy-invasive. Government IDs are not portable across borders. Corporate IDs (Google, Apple, Meta) create surveillance capitalism. 1.1 billion people globally lack any form of legal identity. The world needs a universal, decentralised digital identity system that gives individuals control over their own data.

### Target Users

| Persona | Role | Pain Point | Expected Outcome |
|---------|------|-----------|-----------------|
| Amira (Individual) | University graduate, 24, wants portable ID | Has 50+ accounts across services, each with separate identity | One DID that works everywhere, credentials she controls |
| Dr Chen (Issuer) | University registrar issuing diplomas | Diploma fraud is rampant; verification takes weeks | Issue tamper-proof digital credentials verifiable in seconds |
| TechCorp (Verifier) | HR department hiring globally | Credential verification is manual, slow, and unreliable | Instant, cryptographic verification of education and employment |
| Karim (Developer) | Building an app that needs identity | Implementing auth/identity from scratch is complex and risky | Simple SDK: 5 lines of code to add identity verification |

### Business Value

- **Revenue Impact**: Developer API subscriptions ($49-499/mo based on verifications/month)
- **User Retention**: Identity is a lock-in category — users accumulate credentials over time
- **Competitive Position**: W3C DID + VC standard with ZKP privacy. No equivalent combining all three
- **Strategic Alignment**: $34.5B digital identity market → $83.2B by 2030 (16.2% CAGR)

## User Scenarios & Testing

### User Story 1 — Identity Creation (Priority: P1)

**As an** individual, **I want to** create a decentralised digital identity with a cryptographic keypair, **so that** I own and control my identity without depending on any central authority.

**Acceptance Criteria**:

1. **Given** a user visits /register, **When** they create an account and verify their email, **Then** a did:humanid identifier is generated with an Ed25519 keypair stored securely on their device
2. **Given** a created DID, **When** anyone queries it, **Then** the DID Document is returned conforming to W3C DID Core 1.0 specification
3. **Given** a user with a DID, **When** they set up biometric binding (FIDO2), **Then** their identity requires biometric proof for sensitive operations

### User Story 2 — Credential Issuance (Priority: P1)

**As an** issuing organisation (university, employer, government), **I want to** issue W3C Verifiable Credentials to individuals, **so that** their qualifications are cryptographically verifiable and tamper-proof.

**Acceptance Criteria**:

1. **Given** a registered issuer selects a credential template, **When** they fill in the claim data and sign it, **Then** a W3C Verifiable Credential is issued with Ed25519 digital signature
2. **Given** an issued credential, **When** the holder receives it, **Then** it appears in their wallet with full details and the issuer's trust status
3. **Given** an issuer needs to issue credentials in bulk, **When** they upload a CSV of 500 recipients, **Then** all credentials are issued within 60 seconds

### User Story 3 — Privacy-Preserving Verification (Priority: P1)

**As a** credential holder, **I want to** prove specific claims without revealing my entire credential (e.g., prove I'm over 18 without revealing my birthdate), **so that** my privacy is preserved during verification.

**Acceptance Criteria**:

1. **Given** a verifier requests proof (e.g., "age >= 18"), **When** the holder authorises the verification, **Then** a zero-knowledge proof is generated that proves the claim without revealing the underlying data
2. **Given** a verification request, **When** the verifier receives the proof, **Then** four checks are performed: signature validity, issuer trust status, revocation status, and expiry date
3. **Given** a completed verification, **When** both parties review the result, **Then** an immutable audit log entry is created and the blockchain anchor is updated

### User Story 4 — Wallet Management (Priority: P1)

**As a** credential holder, **I want to** manage my credentials in a digital wallet, view my sharing history, and scan QR codes for verification, **so that** I have full visibility and control over my digital identity.

**Acceptance Criteria**:

1. **Given** a user opens their wallet, **When** the page loads, **Then** all credentials are listed with issuer name, type, issue date, and expiry status
2. **Given** a user encounters a verification QR code, **When** they scan it, **Then** the verification request details are shown and they can choose which credentials to share
3. **Given** a user wants to review their sharing history, **When** they view the history tab, **Then** all past verifications are listed with verifier name, date, and claims shared

### User Story 5 — Developer Integration (Priority: P2)

**As a** developer building an application, **I want to** integrate HumanID verification with a simple SDK, **so that** I can add identity verification to my app without implementing cryptographic protocols from scratch.

**Acceptance Criteria**:

1. **Given** a developer registers on the portal, **When** they generate an API key, **Then** they receive credentials with sandbox access for testing
2. **Given** a developer integrates the TypeScript SDK, **When** they call `humanid.verify(request)`, **Then** the verification flow is handled end-to-end with the result returned as a typed response
3. **Given** a developer wants to monitor usage, **When** they view their dashboard, **Then** API call counts, verification success rates, and costs are displayed
