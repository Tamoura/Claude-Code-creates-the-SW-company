# IT4IT Dashboard - User Manual

**Version**: 1.0
**Last Updated**: 2026-01-28
**Product**: IT4IT Dashboard

---

## Introduction

The IT4IT Dashboard is a comprehensive management tool providing visibility and control across all four IT4IT value streams: Strategy to Portfolio (S2P), Requirement to Deploy (R2D), Request to Fulfill (R2F), and Detect to Correct (D2C).

### Who Is This For?

- **IT Executives** - Strategic visibility into portfolio health and investment performance
- **IT Managers** - Operational oversight of teams, projects, and service delivery
- **IT Practitioners** - Day-to-day incident, change, and request management

### Key Features

- **Executive Dashboard** - Cross-value stream KPIs and health metrics
- **4 Value Streams** - Complete IT4IT implementation (S2P, R2D, R2F, D2C)
- **60+ Pages** - Comprehensive coverage of IT management functions
- **Mock Data** - Realistic data demonstrating production-ready functionality
- **Responsive Design** - Works on desktop and tablet

---

## Getting Started

### Navigation

**Sidebar (Left)**: Quick access to all value streams
- Dashboard (Executive view)
- S2P - Strategy to Portfolio
- R2D - Requirement to Deploy
- R2F - Request to Fulfill  
- D2C - Detect to Correct
- Settings
- Help

**Header (Top)**: Breadcrumbs and user menu

### Dashboard Overview

The executive dashboard provides at-a-glance visibility:
- **Value Stream Health**: Traffic light indicators (green/yellow/red)
- **Key Metrics**: Portfolio value, release velocity, fulfillment SLA, incident MTTR
- **Trend Charts**: Historical performance data
- **Cross-Stream Analytics**: Dependencies and bottlenecks

---

## Strategy to Portfolio (S2P)

Manage IT portfolio from demand intake through investment tracking.

### Demand Management

**Viewing Demands**
1. Click S2P → Demands
2. See Kanban board with columns: New, Assess, Approve, Portfolio, Rejected
3. Filter by priority, category, or submitter
4. Click any demand card for details

**Demand Details**
- Business justification and value proposition
- Cost estimates and resource requirements
- Priority and strategic alignment
- Approval workflow status

### Portfolio Backlog

**Viewing Portfolio Items**
1. Click S2P → Portfolio
2. See prioritized backlog of approved initiatives
3. Sort by value, cost, strategic importance
4. View roadmap alignment

### Investment Tracking

**Monitoring Investments**
1. Click S2P → Investments
2. See all funded initiatives with:
   - Budget vs. actual spend
   - ROI projections
   - Milestone progress
   - Risk indicators

### Roadmap Visualization

1. Click S2P → Roadmap
2. View timeline of initiatives across quarters
3. See dependencies between projects
4. Identify resource conflicts

---

## Requirement to Deploy (R2D)

Manage service lifecycle from requirements through deployment.

### Pipeline Overview

**Viewing Build Pipeline**
1. Click R2D → Pipeline
2. See active pipelines with stage status:
   - Build (running/passed/failed)
   - Test (unit, integration, E2E)
   - Deploy (dev, staging, production)
3. Click pipeline for detailed logs

### Release Calendar

**Managing Releases**
1. Click R2D → Releases
2. View calendar of planned releases
3. See release details:
   - Features included
   - Test coverage
   - Deployment windows
   - Rollback plans
4. Click release for change log

### Environment Status

**Monitoring Environments**
1. Click R2D → Environments
2. See health of all environments:
   - Dev, Test, Staging, Pre-Prod, Production
   - CPU, memory, disk usage
   - Deployment history
   - Active incidents

### Requirements Board

**Tracking Requirements**
1. Click R2D → Requirements
2. View Kanban board: Backlog, In Progress, Review, Done
3. Link requirements to:
   - Builds
   - Test cases
   - Releases

---

## Request to Fulfill (R2F)

Enable users to request and receive IT services efficiently.

### Service Catalog

**Browsing Services**
1. Click R2F → Catalog
2. Browse by category:
   - Infrastructure (VMs, storage, network)
   - Software (licenses, access)
   - Support (help desk, consulting)
3. Click service for details and request options

### My Requests (End User View)

**Tracking Your Requests**
1. Click R2F → My Requests
2. See all submitted requests with:
   - Status (Pending, In Progress, Fulfilled, Cancelled)
   - SLA countdown
   - Fulfillment updates
3. Click request for full history

### Request Queue (Service Desk View)

**Processing Requests**
1. Click R2F → Queue
2. See pending fulfillment requests
3. Filter by: Priority, SLA breach risk, Category
4. Click request to:
   - Update status
   - Add comments
   - Fulfill or escalate

### Subscription Management

**Managing Subscriptions**
1. Click R2F → Subscriptions
2. View active subscriptions (SaaS, licenses, recurring services)
3. See renewal dates and costs
4. Request cancellation or changes

---

## Detect to Correct (D2C)

Detect, diagnose, and resolve IT issues while managing changes safely.

### Event Console

**Monitoring Events**
1. Click D2C → Events
2. See real-time event stream
3. Filter by: Severity, Source, Time range
4. Click event to:
   - Create incident
   - Acknowledge
   - Suppress (false positive)

### Incident Management

**Managing Incidents**
1. Click D2C → Incidents
2. View incident board organized by priority
3. See: ID, Title, Severity (1-4), Priority, Assignee, Status
4. Click incident for:
   - Full timeline
   - Related CIs
   - Resolution notes
   - Problem linkage

**Creating an Incident**
1. Click "New Incident"
2. Fill in details:
   - Title and description
   - Severity (1=Critical, 4=Low)
   - Priority
   - Affected service/CI
   - Assignee
3. Save and track to resolution

### Problem Management

**Investigating Problems**
1. Click D2C → Problems
2. See root cause investigations
3. Link to related incidents
4. Document known errors and workarounds

### Change Management

**Planning Changes**
1. Click D2C → Changes
2. View change board: Requested, Approved, Scheduled, Implementing, Complete
3. See change calendar to identify conflicts
4. Click change for:
   - Change plan and rollback
   - Approval workflow
   - Implementation notes

**Change Calendar**
1. Click D2C → Changes → Calendar
2. View all scheduled changes by date
3. Identify maintenance windows
4. Check for overlapping changes

### CMDB Browser

**Exploring Configuration Items**
1. Click D2C → CMDB
2. Browse CIs by type: Server, Application, Network, Database
3. Click CI for:
   - Attributes (hostname, IP, owner)
   - Relationships (upstream/downstream dependencies)
   - Incident history
   - Change history

---

## Reports and Analytics

### Dashboard Analytics

Each value stream has dedicated analytics:
- **S2P**: Portfolio value delivery, demand funnel
- **R2D**: Build success rate, deployment frequency, lead time
- **R2F**: Fulfillment SLA, catalog usage, popular services
- **D2C**: Incident MTTR, problem resolution rate, change success

### Filters and Search

**Global Search**
1. Click search icon (top-right)
2. Search across all entities: Demands, Requirements, Requests, Incidents, CIs
3. Recent items and saved searches appear first

**Advanced Filters**
- Most pages support multi-field filtering
- Save frequently used filter combinations
- Export filtered results to CSV

---

## Tips and Best Practices

### For IT Executives

- Review executive dashboard daily for early warnings
- Monitor cross-stream analytics for bottlenecks
- Focus on trend lines, not point-in-time metrics
- Set up alerts for threshold breaches

### For IT Managers

- Start each day reviewing your team's queues (incidents, changes, requests)
- Use calendars to plan capacity and avoid conflicts
- Link related items (incidents to problems, requirements to releases)
- Generate reports for stakeholder updates

### For IT Practitioners

- Keep work items updated in real-time
- Document resolution steps for knowledge base
- Use CMDB relationships to understand impact
- Escalate promptly when SLA at risk

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| / | Focus search |
| g then d | Go to dashboard |
| g then s | Go to S2P |
| g then r | Go to R2D |
| g then f | Go to R2F |
| g then c | Go to D2C |
| ? | Show keyboard shortcuts |

---

## Troubleshooting

**Issue: Page loads slowly**
- Check internet connection
- Clear browser cache
- Try different browser
- Report persistent issues

**Issue: Data seems outdated**
- Refresh page (F5)
- Check "Last Updated" timestamp
- Verify you're on correct environment

**Issue: Can't find an item**
- Use global search
- Check filters aren't hiding it
- Verify item exists in correct value stream

---

## Getting Help

- **Help Center**: Click Help in sidebar
- **Guided Tours**: Click "Getting Started" for walkthrough
- **IT4IT Reference**: Documentation of value streams and concepts
- **Support**: Contact IT support team for technical issues

---

**End of User Manual**
