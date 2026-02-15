# QDB One Mock Data Fixtures

This directory contains comprehensive mock data for the Qatar Development Bank unified portal prototype. All data is hardcoded TypeScript/JSON with no external API dependencies.

## Overview

QDB One unifies three legacy portals:
- **Financing Portal** - Loans and applications
- **Guarantee Portal** - Bank guarantees and claims
- **Advisory Portal** - Business development programs and sessions

## Data Files

### Core Data

#### `persons.ts`
- **Persons**: Individual users with QID, contact info, and linked identities
- **Organizations**: Companies with CR numbers and industry classification
- **PersonOrgRole**: Many-to-many relationships between persons and organizations across portals

**Demo Persons:**
- Fatima Al-Kuwari (QID: 28412345678) - Has roles in all three portals
- Ahmed Al-Thani (QID: 28498765432) - Financing customer

**Demo Organizations:**
- Al-Kuwari Trading LLC (CR: 12345) - Import/Export
- Qatar Tech Ventures (CR: 67890) - Technology

### Portal-Specific Data

#### `financing.ts`
- **Loans**: Active loans with payment schedules, interest rates, balances
- **LoanApplications**: Applications in various statuses with timeline tracking

**Key Records:**
- LN-2024-001: QAR 2M expansion loan (linked to guarantee GR-2024-789)
- LN-2023-015: QAR 500K working capital
- LA-2025-042: QAR 750K equipment finance (under review)
- LA-2025-038: QAR 1.2M trade finance (approved)

#### `guarantees.ts`
- **Guarantees**: Bank guarantees with signatory tracking and collateral
- **Claims**: Filed claims against guarantees

**Key Records:**
- GR-2024-789: QAR 1M bank guarantee - **pending Fatima's signature**
- GR-2023-456: QAR 500K performance guarantee (active, has claim)
- GR-2024-100: QAR 200K bid bond (active)

#### `advisory.ts`
- **Programs**: Multi-month business development programs with milestones
- **AdvisorySessions**: Scheduled/completed sessions with advisors
- **Assessments**: Business capability assessments with scoring

**Key Records:**
- PRG-001: SME Growth Accelerator (65% complete)
- ADV-SES-001: Upcoming session on March 1, 2026
- ASMT-001: Business maturity assessment (72/100 score)

### Cross-Portal Data

#### `notifications.ts`
- Real-time notifications from all portals
- Support for read/unread status
- Bilingual (English/Arabic)
- Deep links to source records

**8 notifications** spanning all portals with varying read states

#### `activity.ts`
- Unified activity feed across all portals
- Actions: loan approvals, guarantee signatures, session completions, etc.
- Reverse chronological order

**12 activity items** showing cross-portal interactions

#### `documents.ts`
- Documents linked to financing, guarantee, and advisory records
- File metadata (size, type, upload date)
- Support for search and filtering

**10 documents** including financial statements, guarantee letters, assessment reports

### Admin Data

#### `admin.ts`
- **MatchReviewQueue**: Identity matching candidates for data steward review
- Confidence scoring for potential entity matches
- Matched fields tracking

**5 pending matches** with confidence scores from 95% to 68%

## Data Relationships

### Cross-Portal Links
- Loan `LN-2024-001` → Guarantee `GR-2024-789` (collateral)
- Loan `LN-2024-055` → Advisory Session `ADV-SES-001` (business planning)

### Person Relationships
- Fatima Al-Kuwari:
  - Customer at Al-Kuwari Trading (financing)
  - Stakeholder at Al-Kuwari Trading (advisory)
  - Authorized signatory at Qatar Tech Ventures (guarantee)

## Helper Functions

Each data file exports helper functions for common queries:

```typescript
// Persons
getPersonById(id: string)
getPersonByQid(qid: string)
getPersonOrganizations(personId: string)

// Financing
getLoansByOrg(orgId: string)
getTotalOutstanding(orgId: string)
getUpcomingPayments(orgId: string)

// Guarantees
getPendingSignatures(personId: string)
getActiveGuarantees(orgId: string)
getExpiringGuarantees(orgId: string, daysAhead: number)

// Advisory
getUpcomingSessions(orgId: string)
getLatestAssessment(orgId: string)

// Notifications
getUnreadNotifications(personId: string)
getUnreadCount(personId: string)

// Activity
getRecentActivities(personId: string, days: number)

// Documents
getDocumentsByRecord(sourceRecordId: string)
searchDocuments(query: string)

// Admin
getPendingMatches()
getHighConfidenceMatches(threshold: number)
```

## Usage Example

```typescript
import {
  getPersonByQid,
  getLoansByOrg,
  getPendingSignatures,
  getUnreadNotifications,
  getActivitiesByPerson
} from '@/data';

// Get Fatima's profile
const fatima = getPersonByQid('28412345678');

// Get her organization's loans
const loans = getLoansByOrg('org-001');

// Check what needs her signature
const pendingDocs = getPendingSignatures('person-001');

// Show unread notifications
const notifications = getUnreadNotifications('person-001');

// Display recent activity
const activity = getActivitiesByPerson('person-001', 10);
```

## Currency & Localization

- All monetary amounts in **QAR (Qatari Riyal)**
- Dates in **ISO 8601 format**
- Bilingual support (English/Arabic) for user-facing strings
- Arabic text included for names, titles, descriptions

## Prototype Notes

- This is **mock data only** - no database, no API
- Designed to demonstrate unified portal UX and cross-portal workflows
- Focus user journey: Fatima needs to sign guarantee GR-2024-789
- Demonstrates entity linking across legacy systems (admin match queue)
- Realistic data volumes for development bank operations

## File Sizes

- `persons.ts`: 3.3 KB
- `financing.ts`: 5.8 KB
- `guarantees.ts`: 4.0 KB
- `advisory.ts`: 7.8 KB
- `notifications.ts`: 6.2 KB
- `activity.ts`: 7.5 KB
- `documents.ts`: 4.8 KB
- `admin.ts`: 5.2 KB
- `index.ts`: 1.3 KB

**Total**: ~46 KB of mock data
