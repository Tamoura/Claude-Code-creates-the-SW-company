# ConnectIn Security Architecture - Feature Notes

## Task
Create comprehensive security documentation for ConnectIn:
1. STRIDE Threat Model
2. Security Architecture
3. Developer Security Checklist

## Key Decisions
- STRIDE methodology chosen for threat modeling (industry standard)
- 41 total threats identified across 8 modules
- 7 Critical, 14 High, 12 Medium, 8 Low risk threats
- Dual-token auth: JWT access (15 min) + opaque refresh (7 days)
- RS256 for JWT signing (asymmetric -- server-only signing)
- bcrypt cost factor 12 for passwords
- AES-256-GCM for OAuth token encryption at rest
- DOMPurify for HTML sanitization (all user content)
- Prisma parameterized queries prevent SQL injection by design

## Diagram Count
- THREAT-MODEL.md: 6 Mermaid diagrams
- SECURITY-ARCHITECTURE.md: 5 Mermaid diagrams
- SECURITY-CHECKLIST.md: 0 diagrams (checklist format)
- Total: 11 Mermaid diagrams

## Top Threats (Priority Order)
1. Credential stuffing on auth endpoints
2. XSS via user-generated content (profiles, posts, messages)
3. Privilege escalation (role manipulation, admin access)
4. IDOR in private messaging
5. Session hijacking
6. IDOR in profile editing
7. Malicious file uploads
8. Prompt injection in AI features
9. WebSocket message flood
10. Username enumeration

## Files Created
- products/connectin/docs/security/THREAT-MODEL.md
- products/connectin/docs/security/SECURITY-ARCHITECTURE.md
- products/connectin/docs/security/SECURITY-CHECKLIST.md
