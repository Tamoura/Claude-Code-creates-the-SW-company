# ITIL Dashboard - Agent Addendum

## Product Overview

**Name**: ITIL Dashboard
**Type**: Web Application
**Status**: Inception

A comprehensive IT Service Management (ITSM) dashboard covering the five core ITIL processes with role-based views for executives, managers, and operators.

## Tech Stack

*To be completed by Architect*

| Layer | Technology | Notes |
|-------|------------|-------|
| Frontend | Next.js 14, React 18 | |
| Backend | Fastify | |
| Database | PostgreSQL 15+ | |
| Styling | Tailwind CSS, shadcn/ui | |
| Testing | Vitest, Playwright | |
| Deployment | TBD | |

## Libraries & Dependencies

*To be completed by Architect*

### Adopted (Use These)

| Library | Purpose | Why Chosen |
|---------|---------|------------|
| TBD | TBD | TBD |

### Avoid (Don't Use)

| Library | Reason |
|---------|--------|
| TBD | TBD |

## Site Map

| Route | Status | Description |
|-------|--------|-------------|
| / | MVP | Landing/redirect to dashboard |
| /login | MVP | User login page |
| /register | MVP | User registration (admin only) |
| /forgot-password | MVP | Password reset request |
| /reset-password | MVP | Password reset completion |
| /dashboard | MVP | Role-based main dashboard |
| /dashboard/executive | MVP | Executive dashboard view |
| /dashboard/manager | MVP | Manager dashboard view |
| /dashboard/operator | MVP | Operator dashboard view |
| /incidents | MVP | Incidents list view |
| /incidents/new | MVP | Create new incident |
| /incidents/[id] | MVP | View/edit incident |
| /incidents/[id]/history | MVP | Incident audit history |
| /problems | MVP | Problems list view |
| /problems/new | MVP | Create new problem |
| /problems/[id] | MVP | View/edit problem |
| /problems/known-errors | MVP | Known Error Database |
| /changes | MVP | Changes list view |
| /changes/new | MVP | Create new change request |
| /changes/[id] | MVP | View/edit change |
| /changes/calendar | MVP | Change calendar view |
| /changes/[id]/approval | MVP | Change approval workflow |
| /requests | MVP | Service requests list |
| /requests/new | MVP | Create new service request |
| /requests/[id] | MVP | View/edit request |
| /requests/catalog | MVP | Service catalog browse |
| /knowledge | MVP | Knowledge base home |
| /knowledge/new | MVP | Create new article |
| /knowledge/[id] | MVP | View/edit article |
| /knowledge/search | MVP | Knowledge search |
| /reports | MVP | Reports dashboard |
| /reports/incidents | MVP | Incident reports |
| /reports/sla | MVP | SLA compliance reports |
| /reports/changes | MVP | Change success reports |
| /reports/trends | MVP | Trend analysis |
| /admin | MVP | Admin panel |
| /admin/users | MVP | User management |
| /admin/roles | MVP | Role management |
| /admin/categories | MVP | Category management |
| /admin/sla | MVP | SLA configuration |
| /admin/import | MVP | Data import |
| /admin/export | MVP | Data export |
| /settings | Coming Soon | User settings |
| /settings/profile | Coming Soon | Profile settings |
| /settings/notifications | Coming Soon | Notification preferences |
| /help | MVP | Help/documentation |
| /help/faq | Coming Soon | FAQ section |

## Design Patterns

*To be completed by Architect*

### Component Patterns

TBD

### State Management

TBD

### API Patterns

TBD

## Business Logic

### ID Generation

All records use prefixed sequential IDs:
- Incidents: `INC-XXXXX` (e.g., INC-00001)
- Problems: `PRB-XXXXX` (e.g., PRB-00001)
- Changes: `CHG-XXXXX` (e.g., CHG-00001)
- Requests: `REQ-XXXXX` (e.g., REQ-00001)
- Knowledge: `KB-XXXXX` (e.g., KB-00001)

### Status Workflows

**Incident Status Flow:**
```
New → In Progress → Pending → Resolved → Closed
                 ↘ On Hold ↗
```

**Problem Status Flow:**
```
New → Under Investigation → Known Error → Resolved → Closed
```

**Change Status Flow:**
```
Draft → Submitted → Pending Approval → Approved → Scheduled →
Implementing → Completed → Closed
                        ↘ Failed ↗
                        ↘ Rejected (from Pending Approval)
```

**Request Status Flow:**
```
Submitted → Pending Approval → Approved → Fulfilling → Completed → Closed
                            ↘ Rejected
```

### SLA Configuration

| Priority | Response Time | Resolution Time | Description |
|----------|---------------|-----------------|-------------|
| P1 - Critical | 15 minutes | 1 hour | Complete service outage |
| P2 - High | 30 minutes | 4 hours | Major feature unavailable |
| P3 - Medium | 2 hours | 8 hours | Limited functionality |
| P4 - Low | 8 hours | 24 hours | Minor issues |

SLA breach indicators:
- Green: > 20% time remaining
- Yellow: < 20% time remaining
- Red: SLA breached

### Change Types

| Type | Approval Required | Risk Assessment | Examples |
|------|-------------------|-----------------|----------|
| Standard | No (pre-approved) | Low | Password resets, standard patches |
| Normal | Yes (CAB) | Medium-High | New deployments, config changes |
| Emergency | Yes (expedited) | High | Critical fixes, security patches |

### Validation Rules

**Incident:**
- Title: Required, 5-200 characters
- Description: Required, minimum 20 characters
- Category: Required, from predefined list
- Priority: Required, P1-P4
- Affected User: Optional

**Problem:**
- Title: Required, 5-200 characters
- Description: Required, minimum 50 characters
- At least one linked incident for creation

**Change:**
- Title: Required, 5-200 characters
- Description: Required, minimum 100 characters
- Implementation Plan: Required for Normal/Emergency
- Rollback Plan: Required for Normal/Emergency
- Scheduled Start/End: Required for Normal changes

**Knowledge Article:**
- Title: Required, 5-200 characters
- Content: Required, minimum 100 characters
- Category: Required
- Keywords: At least one required

### Role Permissions

| Permission | Admin | Manager | Operator |
|------------|-------|---------|----------|
| View dashboards | All | All | Own role |
| Create incidents | Yes | Yes | Yes |
| Assign incidents | Yes | Yes | No |
| Create problems | Yes | Yes | No |
| Approve changes | Yes | Yes (CAB) | No |
| Create changes | Yes | Yes | Yes |
| Manage users | Yes | No | No |
| Configure SLAs | Yes | No | No |
| Import/Export | Yes | Yes | Export only |
| Create KB articles | Yes | Yes | Draft only |

## Data Models

*To be completed by Architect*

### Key Entities

- User
- Incident
- Problem
- Change
- ServiceRequest
- KnowledgeArticle
- Category
- SLAConfig
- AuditLog

## External Integrations

None for MVP (standalone application)

## Performance Requirements

- Page load: < 2 seconds
- Dashboard refresh: < 5 seconds
- Search results: < 1 second
- Bundle size: < 500KB initial load

## Special Considerations

### ITIL Terminology

Follow ITIL v4 terminology strictly:
- Use "Incident" not "Ticket"
- Use "Problem" not "Bug"
- Use "Change" not "Release"
- Use "Service Request" not "Task"

### Audit Trail

All entities must maintain full audit trail:
- Created by, created at
- Updated by, updated at
- All field changes logged with before/after values
- Changes must never be permanently deleted (soft delete only)

### Date/Time Handling

- All dates stored in UTC
- Display in user's local timezone
- SLA calculations in business hours (configurable)

### Accessibility

- WCAG 2.1 AA compliance required
- Keyboard navigation for all functions
- Screen reader support
- Color contrast ratios met

---

*Created by*: Product Manager Agent
*Last Updated*: 2025-01-26
