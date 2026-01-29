# Tech Management Helper - Product Requirements Document

**Version**: 1.0
**Last Updated**: 2026-01-26
**Author**: Product Manager Agent
**Status**: Approved

---

## 1. Overview

### 1.1 Vision Statement

Tech Management Helper is a GRC (Governance, Risk, and Compliance) platform designed specifically for Technology Managers in regulated industries. It provides a unified view of compliance status across multiple frameworks (NIST CSF, ISO 27001, COBIT, IT4IT), risk management with visual scoring, control tracking, and asset inventory management. The platform enables technology leaders to demonstrate compliance, manage risks proactively, and maintain audit-ready documentation.

### 1.2 Objectives

| Objective | Metric | Target |
|-----------|--------|--------|
| Reduce compliance reporting time | Time to generate compliance report | < 5 minutes |
| Improve risk visibility | Risks without mitigation plans | < 10% |
| Control implementation tracking | Controls with current assessments | > 90% |
| Asset inventory accuracy | Assets with current status | > 95% |
| User adoption | Weekly active users | 50+ within 3 months |

### 1.3 Scope

**In Scope (MVP):**
- Compliance Dashboard with framework metrics
- IT4IT Value Stream Visualization (S2P, R2D, R2F, D2C)
- Risk Register with scoring (Likelihood x Impact)
- Control Catalog with framework mapping
- Control Assessment workflow
- Asset Inventory with CSV import
- Asset-Risk linking
- Framework Library (NIST CSF, ISO 27001, COBIT, IT4IT)
- User Authentication
- Role-Based Access Control (Admin, Manager, Analyst, Viewer)
- Basic PDF Reporting
- 7-year audit log retention

**Out of Scope (MVP):**
- Multi-organization tenancy
- Real-time collaboration
- Automated control testing
- Integration with external tools (ServiceNow, Jira)
- Mobile native apps
- Advanced analytics/AI recommendations
- Workflow automation
- API for external consumers

---

## 2. User Personas

### 2.1 Sarah - Technology Manager

| Attribute | Details |
|-----------|---------|
| **Role** | Technology Manager at mid-size financial services company |
| **Goals** | Demonstrate compliance to auditors; track risks across IT portfolio |
| **Pain Points** | Spreadsheet chaos; manual report generation; disconnected tools |
| **Tech Savviness** | Medium-High |
| **Usage Frequency** | Daily |

**Quote**: "I need a single dashboard that shows our compliance posture across all frameworks, not five different spreadsheets."

### 2.2 Mike - GRC Analyst

| Attribute | Details |
|-----------|---------|
| **Role** | GRC Analyst responsible for control assessments |
| **Goals** | Efficiently assess controls; track remediation; prepare audit evidence |
| **Pain Points** | Manual evidence collection; no workflow for assessments; audit scrambles |
| **Tech Savviness** | Medium |
| **Usage Frequency** | Daily |

**Quote**: "Every audit season is a fire drill. I need a system that keeps us audit-ready year-round."

### 2.3 John - IT Asset Owner

| Attribute | Details |
|-----------|---------|
| **Role** | IT Infrastructure Lead managing server and network assets |
| **Goals** | Maintain accurate asset inventory; understand asset risk exposure |
| **Pain Points** | Outdated CMDB; no risk visibility per asset; manual CSV updates |
| **Tech Savviness** | High |
| **Usage Frequency** | Weekly |

**Quote**: "I need to know which of my servers are exposed to high risks so I can prioritize patching."

### 2.4 Lisa - Executive Sponsor

| Attribute | Details |
|-----------|---------|
| **Role** | CIO overseeing technology governance |
| **Goals** | Board-ready compliance reports; risk trend visibility; executive dashboard |
| **Pain Points** | No executive summary view; manual report creation; compliance surprises |
| **Tech Savviness** | Low-Medium |
| **Usage Frequency** | Monthly |

**Quote**: "I need to present our compliance status to the board in 5 minutes, not dig through spreadsheets."

---

## 3. User Stories & Requirements

### 3.1 Epic: Compliance Dashboard

#### US-001: View Compliance Summary Dashboard

**Story**: As a Technology Manager, I want to see a dashboard with compliance metrics so that I can quickly assess our overall compliance posture.

**Acceptance Criteria**:
- [ ] Given I am logged in, when I navigate to the dashboard, then I see compliance percentages for each framework
- [ ] Given the dashboard loads, when I view it, then it loads in under 3 seconds with 10,000 assets
- [ ] Given I view framework metrics, when I click a framework, then I navigate to its detail page
- [ ] Given I am a Viewer, when I access the dashboard, then I can view but not edit any data

**Priority**: P0 (Must Have)

---

#### US-002: View IT4IT Value Stream Visualization

**Story**: As a Technology Manager, I want to see IT4IT value streams with compliance mapping so that I can understand compliance across the IT service lifecycle.

**Acceptance Criteria**:
- [ ] Given I view the dashboard, when I look at value streams, then I see S2P, R2D, R2F, D2C streams
- [ ] Given I view a value stream, when I see its phases, then each phase shows control count and compliance %
- [ ] Given I click a value stream phase, when the detail opens, then I see mapped controls and their status

**Priority**: P0 (Must Have)

---

### 3.2 Epic: Risk Management

#### US-003: View Risk Register

**Story**: As a GRC Analyst, I want to view all risks in a register format so that I can manage and track organizational risks.

**Acceptance Criteria**:
- [ ] Given I navigate to risks, when the page loads, then I see a paginated list of risks
- [ ] Given I view risks, when I look at each row, then I see title, category, L x I score, status, owner
- [ ] Given I want to filter, when I use filters, then I can filter by status, category, score range
- [ ] Given I want to sort, when I click column headers, then risks sort by that column

**Priority**: P0 (Must Have)

---

#### US-004: View Risk Matrix

**Story**: As a Technology Manager, I want to see risks on a 5x5 matrix so that I can visualize risk distribution.

**Acceptance Criteria**:
- [ ] Given I view the risk matrix, when it renders, then I see a 5x5 grid (Likelihood x Impact)
- [ ] Given risks exist, when I view the matrix, then risks appear as counts in cells
- [ ] Given I click a cell, when the detail opens, then I see the list of risks in that cell
- [ ] Given I view the matrix, when risks are high, then the cell is colored red

**Priority**: P0 (Must Have)

---

#### US-005: Create and Edit Risk

**Story**: As a GRC Analyst, I want to create and edit risks so that I can maintain the risk register.

**Acceptance Criteria**:
- [ ] Given I click "Add Risk", when the form opens, then I see fields for title, description, category, L, I
- [ ] Given I fill the form, when I save, then the risk is created and appears in the register
- [ ] Given I edit a risk, when I change fields and save, then the changes are persisted
- [ ] Given I save a risk, when the save completes, then an audit log entry is created

**Priority**: P0 (Must Have)

---

#### US-006: Link Risks to Controls and Assets

**Story**: As a GRC Analyst, I want to link risks to controls and assets so that I can track mitigation and exposure.

**Acceptance Criteria**:
- [ ] Given I view a risk, when I click "Link Controls", then I can search and select controls
- [ ] Given I view a risk, when I click "Link Assets", then I can search and select assets
- [ ] Given I link items, when I save, then the links are persisted and visible on the risk detail
- [ ] Given I view an asset, when I look at risks, then I see all risks linked to that asset

**Priority**: P0 (Must Have)

---

### 3.3 Epic: Control Management

#### US-007: View Control Catalog

**Story**: As a GRC Analyst, I want to view a catalog of all controls so that I can track implementation status.

**Acceptance Criteria**:
- [ ] Given I navigate to controls, when the page loads, then I see a paginated list of controls
- [ ] Given I view controls, when I see each row, then I see code, title, category, status, owner
- [ ] Given I want to filter, when I use filters, then I can filter by framework, status, category

**Priority**: P0 (Must Have)

---

#### US-008: Create and Edit Control

**Story**: As a GRC Analyst, I want to create and edit controls so that I can maintain the control catalog.

**Acceptance Criteria**:
- [ ] Given I click "Add Control", when the form opens, then I see fields for code, title, description, category, status
- [ ] Given I save a control, when the save completes, then it appears in the catalog
- [ ] Given I edit a control, when I change the status, then I can add implementation notes

**Priority**: P0 (Must Have)

---

#### US-009: Map Control to Frameworks

**Story**: As a GRC Analyst, I want to map controls to framework requirements so that I can track compliance.

**Acceptance Criteria**:
- [ ] Given I view a control, when I click "Map to Framework", then I see available frameworks
- [ ] Given I select a framework, when I enter the reference ID (e.g., PR.AC-1), then the mapping is saved
- [ ] Given I view a control, when I look at mappings, then I see all framework references

**Priority**: P0 (Must Have)

---

### 3.4 Epic: Control Assessment

#### US-010: Create Control Assessment

**Story**: As a GRC Analyst, I want to assess a control so that I can document its effectiveness.

**Acceptance Criteria**:
- [ ] Given I view a control, when I click "New Assessment", then I see an assessment form
- [ ] Given I fill the form, when I enter rating (1-5), findings, and recommendations, then I can save as draft
- [ ] Given I have a draft, when I click "Submit", then the assessment moves to submitted status

**Priority**: P0 (Must Have)

---

#### US-011: Approve or Reject Assessment

**Story**: As a Manager, I want to approve or reject submitted assessments so that I can ensure quality.

**Acceptance Criteria**:
- [ ] Given I am a Manager, when I view submitted assessments, then I see a queue for review
- [ ] Given I review an assessment, when I click "Approve", then it moves to approved with my name and date
- [ ] Given I review an assessment, when I click "Reject" with a reason, then it returns to draft for revision

**Priority**: P0 (Must Have)

---

### 3.5 Epic: Asset Management

#### US-012: View Asset Inventory

**Story**: As an IT Asset Owner, I want to view all IT assets so that I can manage the inventory.

**Acceptance Criteria**:
- [ ] Given I navigate to assets, when the page loads, then I see a paginated list of assets
- [ ] Given I have 10,000 assets, when the page loads, then it completes in under 3 seconds
- [ ] Given I view assets, when I use filters, then I can filter by type, criticality, status

**Priority**: P0 (Must Have)

---

#### US-013: Import Assets from CSV

**Story**: As an IT Asset Owner, I want to import assets from CSV so that I can bulk load inventory.

**Acceptance Criteria**:
- [ ] Given I click "Import CSV", when I upload a file, then it parses and validates the data
- [ ] Given the CSV has errors, when I see the preview, then errors are highlighted with row numbers
- [ ] Given the CSV is valid, when I confirm import, then assets are created/updated
- [ ] Given I import, when duplicates exist, then I can choose to update or skip

**Priority**: P0 (Must Have)

---

#### US-014: Create and Edit Asset

**Story**: As an IT Asset Owner, I want to create and edit assets so that I can maintain the inventory.

**Acceptance Criteria**:
- [ ] Given I click "Add Asset", when the form opens, then I see fields for name, type, criticality, owner
- [ ] Given I save an asset, when the save completes, then it appears in the inventory
- [ ] Given I edit an asset, when I add metadata (serial number, etc.), then it saves as JSON

**Priority**: P0 (Must Have)

---

### 3.6 Epic: Framework Library

#### US-015: View Framework Library

**Story**: As a GRC Analyst, I want to view the framework library so that I can understand compliance requirements.

**Acceptance Criteria**:
- [ ] Given I navigate to frameworks, when the page loads, then I see NIST CSF, ISO 27001, COBIT, IT4IT
- [ ] Given I select a framework, when I view details, then I see categories and subcategories
- [ ] Given I view a framework, when I look at compliance, then I see % implemented

**Priority**: P0 (Must Have)

---

### 3.7 Epic: User Management & Authentication

#### US-016: User Login

**Story**: As any user, I want to log in with my credentials so that I can access the system.

**Acceptance Criteria**:
- [ ] Given I am on the login page, when I enter valid credentials, then I am authenticated
- [ ] Given I enter invalid credentials, when I submit, then I see an error message
- [ ] Given I am authenticated, when I access the app, then I see content based on my role

**Priority**: P0 (Must Have)

---

#### US-017: Role-Based Access Control

**Story**: As an Admin, I want to manage user roles so that I can control access.

**Acceptance Criteria**:
- [ ] Given I am an Admin, when I view users, then I can change their roles
- [ ] Given a user is a Viewer, when they access the app, then they can only read data
- [ ] Given a user is an Analyst, when they access the app, then they can create and edit (not delete)
- [ ] Given a user is a Manager, when they access the app, then they can approve assessments

**Priority**: P0 (Must Have)

---

### 3.8 Epic: Reporting

#### US-018: Generate PDF Reports

**Story**: As a Technology Manager, I want to generate PDF reports so that I can share compliance status.

**Acceptance Criteria**:
- [ ] Given I click "Generate Report", when I select type (Risk Register, Compliance Summary), then a PDF is generated
- [ ] Given report generation starts, when processing, then I see progress indication
- [ ] Given the PDF is ready, when I click download, then the file downloads

**Priority**: P0 (Must Have)

---

### 3.9 Epic: Audit Trail

#### US-019: View Audit Logs

**Story**: As an Admin, I want to view audit logs so that I can track all system changes.

**Acceptance Criteria**:
- [ ] Given I navigate to audit logs, when the page loads, then I see a list of actions
- [ ] Given I view logs, when I filter by user, entity, or date, then results are filtered
- [ ] Given I view a log entry, when I expand it, then I see old and new values
- [ ] Given logs exist for 7 years, when I query old logs, then they are available

**Priority**: P0 (Must Have)

---

## 4. Non-Functional Requirements

### 4.1 Performance

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-P01 | Dashboard load time with 10,000 assets | < 3 seconds |
| NFR-P02 | API response time (95th percentile) | < 500ms |
| NFR-P03 | PDF report generation | < 30 seconds |
| NFR-P04 | Concurrent users supported | 100 |

### 4.2 Security

| ID | Requirement |
|----|-------------|
| NFR-S01 | TLS 1.2+ for all connections |
| NFR-S02 | AES-256 encryption at rest |
| NFR-S03 | Password hashing with bcrypt |
| NFR-S04 | Session tokens in HTTP-only cookies |
| NFR-S05 | RBAC enforced on all API endpoints |
| NFR-S06 | 7-year audit log retention |

### 4.3 Accessibility

| ID | Requirement |
|----|-------------|
| NFR-A01 | WCAG 2.1 AA compliance |
| NFR-A02 | Keyboard navigation for all interactions |
| NFR-A03 | Screen reader compatible |
| NFR-A04 | Color contrast ratio 4.5:1 minimum |

### 4.4 Reliability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-R01 | System uptime | 99.9% |
| NFR-R02 | Data backup frequency | Daily |
| NFR-R03 | Recovery point objective (RPO) | 24 hours |
| NFR-R04 | Recovery time objective (RTO) | 4 hours |

---

## 5. Data Requirements

### 5.1 Data Entities

| Entity | Description | Key Attributes |
|--------|-------------|----------------|
| User | System user | id, email, name, role |
| Organization | Tenant (future) | id, name, settings |
| Risk | Risk register entry | id, title, likelihood, impact, status |
| Control | Control catalog entry | id, code, title, status |
| Asset | IT asset | id, name, type, criticality |
| Assessment | Control assessment | id, controlId, rating, status |
| Framework | Compliance framework | id, name, type, version |
| AuditLog | Action log | id, userId, action, entityType, timestamp |

### 5.2 Data Retention

| Data Type | Retention Period | Reason |
|-----------|------------------|--------|
| Audit Logs | 7 years | Compliance requirement |
| Assessments | 7 years | Audit evidence |
| Active data | Indefinite | Operational use |
| Deleted records | Soft delete, 90 days | Recovery |

---

## 6. Release Plan

### MVP (Phase 1) - 8 weeks

**Goal**: Core GRC functionality with dashboard, risks, controls, assets, and basic reporting.

**Features Included**:
- US-001 through US-019 (all MVP features)

**Milestones**:
- Week 1-2: Foundation (auth, database, project structure)
- Week 3-4: Risk and Control management
- Week 5-6: Asset management, framework library
- Week 7: Assessment workflow, reporting
- Week 8: Testing, polish, deployment

### Phase 2 - Future

**Potential Features**:
- Multi-organization tenancy
- Advanced analytics dashboard
- Integration with ServiceNow/Jira
- Automated control testing
- Mobile app
- AI-powered risk recommendations

---

## 7. Success Metrics

| Metric | Definition | Target | Measurement |
|--------|------------|--------|-------------|
| Compliance visibility | Frameworks with dashboard metrics | 4 frameworks | System count |
| Risk management | Risks with mitigation plans | > 90% | Weekly report |
| Assessment coverage | Controls assessed in last year | > 80% | Monthly report |
| User adoption | Weekly active users | 50+ in 3 months | Analytics |
| Time savings | Report generation time | < 5 minutes | User feedback |

---

## 8. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Performance with large datasets | Medium | High | Pagination, virtual scrolling, caching |
| Complex framework mappings | Medium | Medium | Pre-seed standard frameworks, JSONB flexibility |
| User adoption resistance | Medium | Medium | Focus on UX, provide training |
| Audit compliance gaps | Low | High | Early audit trail implementation, retention policies |
| Scope creep | High | Medium | Strict MVP definition, defer to Phase 2 |

---

## 9. Open Questions

| # | Question | Owner | Status |
|---|----------|-------|--------|
| 1 | Should we support custom frameworks? | Product | Deferred to Phase 2 |
| 2 | What file types for evidence upload? | Product | Resolved: PDF, images, Office docs |
| 3 | Export format for audit logs? | Product | Resolved: CSV |
| 4 | Password complexity requirements? | Security | Resolved: 8+ chars, 1 upper, 1 number |

---

## Appendix

### A. Glossary

| Term | Definition |
|------|------------|
| GRC | Governance, Risk, and Compliance |
| NIST CSF | NIST Cybersecurity Framework |
| ISO 27001 | Information security management standard |
| COBIT | Control Objectives for Information Technologies |
| IT4IT | IT4IT Reference Architecture for IT management |
| RBAC | Role-Based Access Control |

### B. References

- NIST CSF 2.0: https://www.nist.gov/cyberframework
- ISO 27001:2022: https://www.iso.org/standard/27001
- COBIT 2019: https://www.isaca.org/resources/cobit
- IT4IT 2.1: https://pubs.opengroup.org/it4it/

---

## Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| CEO | | 2026-01-26 | Approved |
| Product Manager | Agent | 2026-01-26 | |
